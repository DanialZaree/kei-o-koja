import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAdminKey, generatePublicId, cleanDisplayName } from "@/lib/text";
import { validateCreateEventInput } from "@/lib/validate";
import { parseFlexibleDate } from "@/lib/dates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  try {
    const whereClause: any = {};
    if (chatId) {
      whereClause.telegramChatId = chatId;
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        dateOptions: {
          include: {
            votes: {
              include: { participant: true },
            },
          },
        },
        placeOptions: true,
        participants: true,
      },
    });

    return NextResponse.json({ ok: true, events });
  } catch (error: any) {
    console.error("Error fetching TG events:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Database error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, organizerName, description, dates, places, telegramChatId } = body;

    const rawDates = Array.isArray(dates) ? dates : [];
    const normalizedDates = rawDates.map((d: any) => {
      if (typeof d === "string") {
        return parseFlexibleDate(d).toISOString();
      }
      return d;
    });

    const rawPlaces = Array.isArray(places) ? places : [];
    const normalizedPlaces = rawPlaces.map((p: any) => {
      if (typeof p === "string") {
        return { name: p };
      }
      return p;
    });

    const validation = validateCreateEventInput({
      title,
      description,
      organizerName,
      dates:
        normalizedDates.length > 0
          ? normalizedDates
          : [new Date(Date.now() + 24 * 3600 * 1000).toISOString()],
      places: normalizedPlaces,
    });

    if (!validation.ok || !validation.data) {
      return NextResponse.json(
        { ok: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const validData = validation.data;
    const publicId = generatePublicId();
    const adminKey = generateAdminKey();

    const createdEvent = await prisma.$transaction(async (tx) => {
      const ev = await tx.event.create({
        data: {
          publicId,
          adminKey,
          title: validData.title,
          description: validData.description,
          organizerName: cleanDisplayName(validData.organizerName),
          status: "OPEN",
          telegramChatId: telegramChatId ? String(telegramChatId) : null,
        },
      });

      for (const d of validData.dates) {
        await tx.dateOption.create({
          data: {
            eventId: ev.id,
            startsAt: new Date(d),
          },
        });
      }

      for (const p of validData.places) {
        await tx.placeOption.create({
          data: {
            eventId: ev.id,
            name: p.name,
            url: p.url,
            note: p.note,
          },
        });
      }

      return ev;
    });

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const publicUrl = `${origin}/e/${publicId}`;
    const adminUrl = `${origin}/e/${publicId}?admin=${adminKey}`;

    return NextResponse.json({
      ok: true,
      event: {
        id: createdEvent.id,
        publicId,
        adminKey,
        title: createdEvent.title,
        publicUrl,
        adminUrl,
      },
    });
  } catch (error: any) {
    console.error("Error creating TG event:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Database error" },
      { status: 500 }
    );
  }
}

