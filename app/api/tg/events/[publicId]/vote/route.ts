import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeNameKey, cleanDisplayName } from "@/lib/text";

export async function POST(
  request: Request,
  { params }: { params: { publicId: string } }
) {
  const { publicId } = params;

  try {
    const body = await request.json();
    const { name, dateIds = [], placeIds = [] } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: "نام رأی‌دهنده باید حداقل ۲ کاراکتر باشد." },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { publicId },
      include: {
        dateOptions: true,
        placeOptions: true,
        participants: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { ok: false, error: "دورهمی یافت نشد." },
        { status: 404 }
      );
    }

    if (event.status !== "OPEN") {
      return NextResponse.json(
        { ok: false, error: "رأی‌گیری این دورهمی بسته شده است." },
        { status: 400 }
      );
    }

    const nameKey = normalizeNameKey(name);
    const displayName = cleanDisplayName(name);

    // Limit check
    const existing = event.participants.find((p) => p.nameKey === nameKey);
    if (!existing && event.participants.length >= 100) {
      return NextResponse.json(
        { ok: false, error: "ظرفیت شرکت‌کنندگان تکمیل شده است." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Check event is still open inside transaction (TOCTOU protection)
      const ev = await tx.event.findUniqueOrThrow({
        where: { id: event.id },
      });
      if (ev.status !== "OPEN") {
        throw new Error("رأی‌گیری بسته شده است.");
      }

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

      // Clear previous votes
      await tx.dateVote.deleteMany({
        where: { participantId: participant.id },
      });
      await tx.placeVote.deleteMany({
        where: { participantId: participant.id },
      });

      // Insert new date votes
      for (const dId of dateIds) {
        if (event.dateOptions.some((d) => d.id === dId)) {
          await tx.dateVote.create({
            data: { participantId: participant.id, dateOptionId: dId },
          });
        }
      }

      // Insert new place votes
      for (const pId of placeIds) {
        if (event.placeOptions.some((p) => p.id === pId)) {
          await tx.placeVote.create({
            data: { participantId: participant.id, placeOptionId: pId },
          });
        }
      }
    });

    return NextResponse.json({
      ok: true,
      message: `${displayName} عزیز، رأی شما با موفقیت ثبت شد!`,
    });
  } catch (error: any) {
    console.error("Error submitting vote from TG:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "خطا در ثبت رأی" },
      { status: 500 }
    );
  }
}

