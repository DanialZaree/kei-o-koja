import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateResults } from "@/lib/results";

export async function GET(
  request: Request,
  { params }: { params: { publicId: string } }
) {
  const { publicId } = params;

  try {
    const event = await prisma.event.findUnique({
      where: { publicId },
      include: {
        dateOptions: {
          include: {
            votes: {
              include: { participant: true },
            },
          },
        },
        placeOptions: {
          include: {
            votes: {
              include: { participant: true },
            },
          },
        },
        participants: {
          include: {
            dateVotes: true,
            placeVotes: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { ok: false, error: "دورهمی یافت نشد." },
        { status: 404 }
      );
    }

    const results = calculateResults(
      event.dateOptions,
      event.placeOptions,
      event.participants
    );

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    return NextResponse.json({
      ok: true,
      event: {
        id: event.id,
        publicId: event.publicId,
        title: event.title,
        description: event.description,
        organizerName: event.organizerName,
        status: event.status,
        finalDateOptionId: event.finalDateOptionId,
        finalPlaceOptionId: event.finalPlaceOptionId,
        finalizedAt: event.finalizedAt,
        telegramChatId: event.telegramChatId,
        publicUrl: `${origin}/e/${event.publicId}`,
        adminUrl: `${origin}/e/${event.publicId}?admin=${event.adminKey}`,
      },
      results,
    });
  } catch (error: any) {
    console.error("Error fetching event details:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Database error" },
      { status: 500 }
    );
  }
}

