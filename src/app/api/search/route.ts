import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { getPrimaryMembership } from "@/lib/family/membership";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const userId = await requireUserId();
  const membership = await getPrimaryMembership(prisma, userId);
  if (!membership) return NextResponse.json([]);

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const events = await prisma.event.findMany({
    where: {
      familyId: membership.familyId,
      title: { contains: q, mode: "insensitive" },
    },
    orderBy: { startsAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      allDay: true,
      color: true,
      isBirthday: true,
      description: true,
      responsibleUser: { select: { name: true } },
      createdByUser: { select: { name: true } },
      recurrenceRule: true,
      reminderRules: true,
    },
  });

  return NextResponse.json(
    events.map((ev) => ({
      id: ev.id,
      title: ev.title,
      startsAt: ev.startsAt.toISOString(),
      endsAt: ev.endsAt.toISOString(),
      allDay: ev.allDay,
      color: ev.color,
      isBirthday: ev.isBirthday,
      description: ev.description,
      responsibleName: ev.responsibleUser?.name ?? null,
      createdByName: ev.createdByUser.name,
      reminderMinutes: ev.reminderRules.find((r) => r.channel === "push")?.minutesBeforeStart ?? null,
      isRecurring: !!ev.recurrenceRule,
      recurrence: ev.recurrenceRule
        ? { frequency: ev.recurrenceRule.frequency, interval: ev.recurrenceRule.interval, until: ev.recurrenceRule.until?.toISOString() ?? null }
        : null,
    })),
  );
}
