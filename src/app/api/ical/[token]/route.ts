import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateIcal } from "@/lib/ical/generate";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const family = await prisma.family.findUnique({
    where: { calendarToken: token },
    include: {
      events: {
        include: { recurrenceRule: true },
        orderBy: { startsAt: "asc" },
      },
    },
  });

  if (!family) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ical = generateIcal(
    family.name,
    family.events.map((ev) => ({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      startsAt: ev.startsAt,
      endsAt: ev.endsAt,
      allDay: ev.allDay,
      recurrenceRule: ev.recurrenceRule
        ? {
            frequency: ev.recurrenceRule.frequency,
            interval: ev.recurrenceRule.interval,
            until: ev.recurrenceRule.until,
          }
        : null,
    })),
  );

  return new Response(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${family.name}.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
