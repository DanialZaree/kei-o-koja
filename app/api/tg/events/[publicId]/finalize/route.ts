import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function POST(
  request: Request,
  { params }: { params: { publicId: string } }
) {
  const { publicId } = params;
  try {
    const body = await request.json();
    const { dateIndex, placeIndex, dateTitle, placeTitle } = body || {};

    const event = await prisma.event.findUnique({
      where: { publicId },
      include: {
        dateOptions: true,
        placeOptions: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { ok: false, error: "دورهمی یافت نشد." },
        { status: 404 }
      );
    }

    // Pick date option
    let selectedDate = event.dateOptions[0];
    if (typeof dateIndex === "number" && event.dateOptions[dateIndex]) {
      selectedDate = event.dateOptions[dateIndex];
    } else if (dateTitle) {
      const match = event.dateOptions.find(
        (d) => d.startsAt.toISOString() === dateTitle
      );
      if (match) selectedDate = match;
    }

    // Pick place option
    let selectedPlace = null;
    if (typeof placeIndex === "number" && event.placeOptions[placeIndex]) {
      selectedPlace = event.placeOptions[placeIndex];
    } else if (placeTitle) {
      const match = event.placeOptions.find((p) => p.name === placeTitle);
      if (match) selectedPlace = match;
    }

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        status: "FINALIZED",
        finalDateOptionId: selectedDate ? selectedDate.id : null,
        finalPlaceOptionId: selectedPlace ? selectedPlace.id : null,
        finalizedAt: new Date(),
      },
    });

    revalidatePath(`/e/${publicId}`);

    return NextResponse.json({
      ok: true,
      event: updated,
      finalDate: selectedDate,
      finalPlace: selectedPlace,
    });
  } catch (error: any) {
    console.error("Error finalizing from TG:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Database error" },
      { status: 500 }
    );
  }
}

