import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const userId = await requireUserId();
    const event = await prisma.event.findUnique({ where: { id }, select: { familyId: true } });
    if (!event) return NextResponse.json([]);

    const member = await prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: event.familyId, userId } },
    });
    if (!member) return NextResponse.json([], { status: 403 });

    const items = await prisma.checklistItem.findMany({
      where: { eventId: id },
      select: { id: true, text: true, checked: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([], { status: 401 });
  }
}
