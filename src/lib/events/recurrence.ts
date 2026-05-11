import { RRule } from "rrule";

type Frequency = "daily" | "weekly" | "monthly";

const frequencyMap: Record<Frequency, number> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
};

export function expandRecurringEvent(args: {
  event: { id: string; startsAt: Date; endsAt: Date };
  recurrenceRule: { frequency: Frequency; interval: number; until: Date | null; count: number | null };
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const durationMs = args.event.endsAt.getTime() - args.event.startsAt.getTime();
  const rule = new RRule({
    freq: frequencyMap[args.recurrenceRule.frequency],
    dtstart: args.event.startsAt,
    interval: args.recurrenceRule.interval,
    until: args.recurrenceRule.until ?? undefined,
    count: args.recurrenceRule.count ?? undefined,
  });

  return rule.between(args.rangeStart, args.rangeEnd, true).map((startsAt) => ({
    eventId: args.event.id,
    startsAt,
    endsAt: new Date(startsAt.getTime() + durationMs),
  }));
}
