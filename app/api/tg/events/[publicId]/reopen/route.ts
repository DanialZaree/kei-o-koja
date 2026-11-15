import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function POST(
  request: Request,
  { params }: { params: { publicId: string } }
) {
  const { publicId } = params;
  try {
    const event = await prisma.event.findUnique({ where: { publicId } });
    if (!event) {
      return NextResponse.json(
        { ok: false, error: "دورهمی یافت نشد." },
        { status: 404 }
      );
    }

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        status: "OPEN",
        finalDateOptionId: null,
        finalPlaceOptionId: null,
        finalizedAt: null,
      },
    });

    revalidatePath(`/e/${publicId}`);

    return NextResponse.json({ ok: true, event: updated });
  } catch (error: any) {
    console.error("Error reopening from TG:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Database error" },
      { status: 500 }
    );
  }
}
