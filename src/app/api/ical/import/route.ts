import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { getPrimaryMembership } from "@/lib/family/membership";
import { prisma } from "@/lib/db";
import { parseIcal, parseRRule } from "@/lib/ical/parse";

export async function POST(req: Request) {
  const userId = await requireUserId();
  const membership = await getPrimaryMembership(prisma, userId);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const content = await file.text();
  const parsed = parseIcal(content);

  if (parsed.length === 0) {
    return NextResponse.json({ error: "Ingen begivenheder fundet i filen" }, { status: 400 });
  }

  let imported = 0;
  for (const ev of parsed) {
    try {
      const recurrence = ev.rruleStr ? parseRRule(ev.rruleStr) : null;
      await prisma.event.create({
        data: {
          familyId: membership.familyId,
          createdByUserId: userId,
          title: ev.title.slice(0, 120),
          description: ev.description.slice(0, 2000),
          startsAt: ev.startsAt,
          endsAt: ev.endsAt,
          allDay: ev.allDay,
          color: "#3B82F6",
          ...(recurrence
            ? {
                recurrenceRule: {
                  create: {
                    frequency: recurrence.frequency,
                    interval: recurrence.interval,
                    until: recurrence.until,
                  },
                },
              }
            : {}),
        },
      });
      imported++;
    } catch {
      // skip invalid events
    }
  }

  return NextResponse.json({ imported, total: parsed.length });
}
