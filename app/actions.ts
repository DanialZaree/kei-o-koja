"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  generateAdminKey,
  generatePublicId,
  normalizeNameKey,
  cleanDisplayName,
} from "@/lib/text";
import {
  validateCreateEventInput,
  validateVoteInput,
  validateEventInfoUpdate,
  validateDateOptionInput,
  validatePlaceOptionInput,
} from "@/lib/validate";

export interface ActionResult<T = unknown> {
  ok: boolean;
  errors?: Record<string, string>;
  data?: T;
  redirectUrl?: string;
  message?: string;
}


export async function createEventAction(data: {
  title?: unknown;
  description?: unknown;
  organizerName?: unknown;
  dates?: unknown;
  places?: unknown;
}): Promise<ActionResult> {
  const validation = validateCreateEventInput(data);
  if (!validation.ok || !validation.data) {
    return { ok: false, errors: validation.errors };
  }

  const { title, description, organizerName, dates, places } = validation.data;
  const publicId = generatePublicId();
  // admin key is kept in plaintext in the link for zero-friction sharing without passwords
  const adminKey = generateAdminKey();

  try {
    await prisma.$transaction(async (tx) => {
      const createdEvent = await tx.event.create({
        data: {
          publicId,
          adminKey,
          title,
          description,
          organizerName: cleanDisplayName(organizerName),
          status: "OPEN",
        },
      });

      // Create DateOptions
      for (const d of dates) {
        await tx.dateOption.create({
          data: {
            eventId: createdEvent.id,
            startsAt: new Date(d),
          },
        });
      }

      // Create PlaceOptions if any
      for (const p of places) {
        await tx.placeOption.create({
          data: {
            eventId: createdEvent.id,
            name: p.name,
            url: p.url,
            note: p.note,
          },
        });
      }
    });

    return {
      ok: true,
      redirectUrl: `/e/${publicId}?admin=${adminKey}&created=1`,
    };
  } catch (error) {
    console.error("Error creating event:", error);
    return {
      ok: false,
      errors: {
        form: "خطایی در ساخت دورهمی در پایگاه‌داده رخ داد. لطفاً دوباره تلاش کنید.",
      },
    };
  }
}


export async function saveVotesAction(
  publicId: string,
  data: {
    name?: unknown;
    dateIds?: unknown;
    placeIds?: unknown;
  }
): Promise<ActionResult> {
  const event = await prisma.event.findUnique({
    where: { publicId },
    include: {
      dateOptions: true,
      placeOptions: true,
      participants: true,
    },
  });

  if (!event) {
    return { ok: false, errors: { form: "دورهمی مورد نظر یافت نشد." } };
  }

  if (event.status !== "OPEN") {
    return { ok: false, errors: { form: "رأی‌گیری بسته شده است." } };
  }

  const validation = validateVoteInput(data);
  if (!validation.ok || !validation.data) {
    return { ok: false, errors: validation.errors };
  }

  const { name, dateIds, placeIds } = validation.data;

  // Validate IDs belong to this event
  const validDateIds = new Set(event.dateOptions.map((d) => d.id));
  for (const dId of dateIds) {
    if (!validDateIds.has(dId)) {
      return { ok: false, errors: { form: "گزینه تاریخ نامعتبر است." } };
    }
  }

  const validPlaceIds = new Set(event.placeOptions.map((p) => p.id));
  for (const pId of placeIds) {
    if (!validPlaceIds.has(pId)) {
      return { ok: false, errors: { form: "گزینه مکان نامعتبر است." } };
    }
  }

  const nameKey = normalizeNameKey(name);
  const displayName = cleanDisplayName(name);

  // Check 50 participants limit
  const existingParticipant = event.participants.find((p) => p.nameKey === nameKey);
  if (!existingParticipant && event.participants.length >= 50) {
    return {
      ok: false,
      errors: {
        form: "ظرفیت شرکت‌کنندگان این دورهمی تکمیل شده است (حداکثر ۵۰ نفر).",
      },
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const participant = await tx.participant.upsert({
        where: {
          eventId_nameKey: {
            eventId: event.id,
            nameKey,
          },
        },
        create: {
          eventId: event.id,
          name: displayName,
          nameKey,
        },
        update: {
          name: displayName,
        },
      });

      // delete old votes first, otherwise unchecked boxes would stay saved
      await tx.dateVote.deleteMany({
        where: { participantId: participant.id },
      });
      await tx.placeVote.deleteMany({
        where: { participantId: participant.id },
      });

      // Create new date votes
      for (const dateOptionId of dateIds) {
        await tx.dateVote.create({
          data: {
            participantId: participant.id,
            dateOptionId,
          },
        });
      }

      // Create new place votes
      for (const placeOptionId of placeIds) {
        await tx.placeVote.create({
          data: {
            participantId: participant.id,
            placeOptionId,
          },
        });
      }
    });

    revalidatePath(`/e/${publicId}`);
    return { ok: true, message: "رأی‌ات با موفقیت ثبت شد." };
  } catch (error) {
    console.error("Error saving votes:", error);
    return { ok: false, errors: { form: "خطا در ثبت رأی. دوباره تلاش کنید." } };
  }
}

export async function updateEventInfoAction(
  publicId: string,
  adminKey: string,
  data: {
    title?: unknown;
    description?: unknown;
  }
): Promise<ActionResult> {
  const event = await prisma.event.findUnique({
    where: { publicId },
  });

  if (!event || event.adminKey !== adminKey) {
    return { ok: false, errors: { general: "کلید مدیریت نامعتبر است." } };
  }

  const validation = validateEventInfoUpdate(data);
  if (!validation.ok || !validation.data) {
    return { ok: false, errors: validation.errors };
  }

  try {
    await prisma.event.update({
      where: { id: event.id },
      data: {
        title: validation.data.title,
        description: validation.data.description,
      },
    });

    revalidatePath(`/e/${publicId}`);
    return { ok: true };
  } catch (error) {
    console.error("Error updating event info:", error);
    return { ok: false, errors: { general: "خطا در به‌روزرسانی اطلاعات." } };
  }
}

export async function addDateOptionAction(
  publicId: string,
  adminKey: string,
  startsAtIso?: unknown
): Promise<ActionResult> {
  const event = await prisma.event.findUnique({
    where: { publicId },
    include: { dateOptions: true },
  });

  if (!event || event.adminKey !== adminKey) {
    return { ok: false, errors: { general: "کلید مدیریت نامعتبر است." } };
  }

  if (event.status !== "OPEN") {
    return { ok: false, errors: { general: "تنها در وضعیت باز می‌توانید گزینه اضافه کنید." } };
  }

  if (event.dateOptions.length >= 10) {
    return { ok: false, errors: { startsAt: "حداکثر ۱۰ تاریخ مجاز است." } };
  }

  const validation = validateDateOptionInput(startsAtIso);
  if (!validation.ok || !validation.data) {
    return { ok: false, errors: validation.errors };
  }

  try {
    await prisma.dateOption.create({
      data: {
        eventId: event.id,
        startsAt: validation.data,
      },
    });

    revalidatePath(`/e/${publicId}`);
    return { ok: true };
  } catch (error) {
    console.error("Error adding date option:", error);
    return { ok: false, errors: { startsAt: "خطا در افزودن تاریخ." } };
  }
}

export async function updateDateOptionAction(
  publicId: string,
  adminKey: string,
  dateOptionId: string,
  startsAtIso?: unknown
): Promise<ActionResult> {
  const event = await prisma.event.findUnique({
    where: { publicId },
    include: { dateOptions: true },
  });

  if (!event || event.adminKey !== adminKey) {
    return { ok: false, errors: { general: "کلید مدیریت نامعتبر است." } };
  }

  if (event.status !== "OPEN") {
    return { ok: false, errors: { general: "تنها در وضعیت باز می‌توانید گزینه ویرایش کنید." } };
  }

  const dateOption = event.dateOptions.find((d) => d.id === dateOptionId);
  if (!dateOption) {
    return { ok: false, errors: { general: "گزینه تاریخ یافت نشد." } };
  }

  const validation = validateDateOptionInput(startsAtIso);
  if (!validation.ok || !validation.data) {
    return { ok: false, errors: validation.errors };
  }

  const validStartsAt = validation.data;

  try {
    await prisma.$transaction(async (tx) => {
      // clear votes because the time was changed after people voted
      await tx.dateVote.deleteMany({
        where: { dateOptionId },
      });

      // Update date option
      await tx.dateOption.update({
        where: { id: dateOptionId },
        data: {
          startsAt: validStartsAt,
          changedAt: new Date(),
        },
      });
    });

    revalidatePath(`/e/${publicId}`);
    return { ok: true };
  } catch (error) {
    console.error("Error updating date option:", error);
    return { ok: false, errors: { startsAt: "خطا در به‌روزرسانی تاریخ." } };
  }
}

export async function deleteDateOptionAction(
  publicId: string,
  adminKey: string,
  dateOptionId: string
): Promise<ActionResult> {
  const event = await prisma.event.findUnique({
    where: { publicId },
    include: { dateOptions: true },
  });

  if (!event || event.adminKey !== adminKey) {
    return { ok: false, errors: { general: "کلید مدیریت نامعتبر است." } };
  }

  if (event.status !== "OPEN") {
    return { ok: false, errors: { general: "تنها در وضعیت باز می‌توانید گزینه حذف کنید." } };
  }

  if (event.dateOptions.length <= 1) {
    return { ok: false, errors: { general: "حذف آخرین تاریخ ممکن نیست." } };
  }

  try {
    await prisma.dateOption.delete({
      where: { id: dateOptionId },
    });

    revalidatePath(`/e/${publicId}`);
    return { ok: true };
  } catch (error) {
    console.error("Error deleting date option:", error);
    return { ok: false, errors: { general: "خطا در حذف تاریخ." } };
  }
}

export async function addPlaceOptionAction(
  publicId: string,
  adminKey: string,
  data: {
    name?: unknown;
    url?: unknown;
    note?: unknown;
  }
): Promise<ActionResult> {
  const event = await prisma.event.findUnique({
    where: { publicId },
    include: { placeOptions: true },
  });

  if (!event || event.adminKey !== adminKey) {
    return { ok: false, errors: { general: "کلید مدیریت نامعتبر است." } };
  }

  if (event.status !== "OPEN") {
    return { ok: false, errors: { general: "تنها در وضعیت باز می‌توانید گزینه اضافه کنید." } };
  }

  if (event.placeOptions.length >= 10) {
    return { ok: false, errors: { name: "حداکثر ۱۰ مکان مجاز است." } };
  }

  const validation = validatePlaceOptionInput(data);
  if (!validation.ok || !validation.data) {
    return { ok: false, errors: validation.errors };
  }

  try {
    await prisma.placeOption.create({
      data: {
        eventId: event.id,
        name: validation.data.name,
        url: validation.data.url,
        note: validation.data.note,
      },
    });

    revalidatePath(`/e/${publicId}`);
    return { ok: true };
  } catch (error) {
    console.error("Error adding place option:", error);
    return { ok: false, errors: { name: "خطا در افزودن مکان." } };
  }
}

export async function updatePlaceOptionAction(
  publicId: string,
  adminKey: string,
  placeOptionId: string,
  data: {
    name?: unknown;
    url?: unknown;
    note?: unknown;
  }
): Promise<ActionResult> {
  const event = await prisma.event.findUnique({
    where: { publicId },
    include: { placeOptions: true },
  });

  if (!event || event.adminKey !== adminKey) {
    return { ok: false, errors: { general: "کلید مدیریت نامعتبر است." } };
  }

  if (event.status !== "OPEN") {
    return { ok: false, errors: { general: "تنها در وضعیت باز می‌توانید گزینه ویرایش کنید." } };
  }

  const placeOption = event.placeOptions.find((p) => p.id === placeOptionId);
  if (!placeOption) {
    return { ok: false, errors: { general: "گزینه مکان یافت نشد." } };
  }

  const validation = validatePlaceOptionInput(data);
  if (!validation.ok || !validation.data) {
    return { ok: false, errors: validation.errors };
  }

  const validPlaceData = validation.data;

  try {
    await prisma.$transaction(async (tx) => {
      // clear votes because the place details changed after people voted
      await tx.placeVote.deleteMany({
        where: { placeOptionId },
      });

      // Update place option
      await tx.placeOption.update({
        where: { id: placeOptionId },
        data: {
          name: validPlaceData.name,
          url: validPlaceData.url,
          note: validPlaceData.note,
          changedAt: new Date(),
        },
      });
    });

    revalidatePath(`/e/${publicId}`);
    return { ok: true };
  } catch (error) {
    console.error("Error updating place option:", error);
    return { ok: false, errors: { name: "خطا در به‌روزرسانی مکان." } };
  }
}

export async function deletePlaceOptionAction(
  publicId: string,
  adminKey: string,
  placeOptionId: string
): Promise<ActionResult> {
  const event = await prisma.event.findUnique({
    where: { publicId },
  });

  if (!event || event.adminKey !== adminKey) {
    return { ok: false, errors: { general: "کلید مدیریت نامعتبر است." } };
  }

  if (event.status !== "OPEN") {
    return { ok: false, errors: { general: "تنها در وضعیت باز می‌توانید گزینه حذف کنید." } };
  }

  try {
    await prisma.placeOption.delete({
      where: { id: placeOptionId },
    });

    revalidatePath(`/e/${publicId}`);
    return { ok: true };
  } catch (error) {
    console.error("Error deleting place option:", error);
    return { ok: false, errors: { general: "خطا در حذف مکان." } };
  }
}

export async function finalizeEventAction(
  publicId: string,
  adminKey: string,
  dateId: string,
  placeId?: string
): Promise<ActionResult> {
  const event = await prisma.event.findUnique({
    where: { publicId },
    include: {
      dateOptions: true,
      placeOptions: true,
    },
  });

  if (!event || event.adminKey !== adminKey) {
    return { ok: false, errors: { general: "کلید مدیریت نامعتبر است." } };
  }

  if (event.status !== "OPEN") {
    return { ok: false, errors: { general: "دورهمی از قبل نهایی شده است." } };
  }

  // Validate dateId
  const validDate = event.dateOptions.find((d) => d.id === dateId);
  if (!validDate) {
    return { ok: false, errors: { dateId: "تاریخ نهایی انتخاب شده نامعتبر است." } };
  }

  // If places exist, placeId is required
  if (event.placeOptions.length > 0) {
    if (!placeId) {
      return { ok: false, errors: { general: "انتخاب مکان نهایی الزامی است." } };
    }
    const validPlace = event.placeOptions.find((p) => p.id === placeId);
    if (!validPlace) {
      return { ok: false, errors: { general: "مکان نهایی انتخاب شده نامعتبر است." } };
    }
  }

  try {
    await prisma.event.update({
      where: { id: event.id },
      data: {
        status: "FINALIZED",
        finalDateOptionId: dateId,
        finalPlaceOptionId: placeId || null,
        finalizedAt: new Date(),
      },
    });

    revalidatePath(`/e/${publicId}`);
    return { ok: true };
  } catch (error) {
    console.error("Error finalizing event:", error);
    return { ok: false, errors: { general: "خطا در نهایی‌سازی دورهمی." } };
  }
}

export async function reopenEventAction(
  publicId: string,
  adminKey: string
): Promise<ActionResult> {
  const event = await prisma.event.findUnique({
    where: { publicId },
  });

  if (!event || event.adminKey !== adminKey) {
    return { ok: false, errors: { general: "کلید مدیریت نامعتبر است." } };
  }

  if (event.status !== "FINALIZED") {
    return { ok: false, errors: { general: "دورهمی در حال حاضر باز است." } };
  }

  try {
    await prisma.event.update({
      where: { id: event.id },
      data: {
        status: "OPEN",
        finalDateOptionId: null,
        finalPlaceOptionId: null,
        finalizedAt: null,
      },
    });

    revalidatePath(`/e/${publicId}`);
    return { ok: true };
  } catch (error) {
    console.error("Error reopening event:", error);
    return { ok: false, errors: { general: "خطا در بازگشایی دورهمی." } };
  }
}
