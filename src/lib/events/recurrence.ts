import { RRule } from "rrule";

const FREQ_MAP = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
} as const;

type RawRecurrenceRule = {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  until: Date | null;
  count: number | null;
};

type RawOverride = {
  occurrenceDate: Date;
  title: string | null;
  description: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  allDay: boolean | null;
  color: string | null;
  responsibleUserId: string | null;
  isCancelled: boolean;
};

type RawEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  description: string;
  allDay: boolean;
  isBirthday: boolean;
  color: string;
  createdByUserId: string;
  createdByUser: { name: string };
  responsibleUser: { name: string } | null;
  responsibleUserId: string | null;
  needsConfirmation: boolean;
  confirmWithUserId: string | null;
  confirmWithUser: { name: string } | null;
  counterProposalStart: Date | null;
  counterProposalEnd: Date | null;
  recurrenceRule: RawRecurrenceRule | null;
  reminderRules: { minutesBeforeStart: number; channel: string }[];
  overrides: RawOverride[];
  participants: { userId: string; user: { name: string } }[];
};

export type CalendarEventData = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  description: string;
  allDay: boolean;
  isBirthday: boolean;
  color: string;
  createdByUserId: string;
  createdByName: string;
  responsibleUserId: string | null;
  responsibleName: string | null;
  needsConfirmation: boolean;
  confirmWithUserId: string | null;
  confirmWithName: string | null;
  counterProposalStart: string | null;
  counterProposalEnd: string | null;
  isRecurring: boolean;
  occurrenceDate: string | null;
  reminderMinutes: number | null;
  recurrence: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    until: string | null;
  } | null;
  participants: { userId: string; name: string }[];
};

export function expandEvents(
  events: RawEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEventData[] {
  const results: CalendarEventData[] = [];

  for (const event of events) {
    const pushReminder = event.reminderRules.find((r) => r.channel === "push");
    const base = {
      id: event.id,
      title: event.title,
      description: event.description,
      allDay: event.allDay,
      isBirthday: event.isBirthday,
      color: event.color,
      createdByUserId: event.createdByUserId,
      createdByName: event.createdByUser.name,
      responsibleUserId: event.responsibleUserId,
      responsibleName: event.responsibleUser?.name ?? null,
      needsConfirmation: event.needsConfirmation,
      confirmWithUserId: event.confirmWithUserId,
      confirmWithName: event.confirmWithUser?.name ?? null,
      counterProposalStart: event.counterProposalStart?.toISOString() ?? null,
      counterProposalEnd: event.counterProposalEnd?.toISOString() ?? null,
      participants: event.participants.map((p) => ({ userId: p.userId, name: p.user.name })),
      isRecurring: !!event.recurrenceRule,
      occurrenceDate: null as string | null,
      reminderMinutes: pushReminder?.minutesBeforeStart ?? null,
      recurrence: event.recurrenceRule
        ? {
            frequency: event.recurrenceRule.frequency,
            interval: event.recurrenceRule.interval,
            until: event.recurrenceRule.until?.toISOString() ?? null,
          }
        : null,
    };

    if (!event.recurrenceRule) {
      results.push({
        ...base,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
      });
      continue;
    }

    const durationMs = event.endsAt.getTime() - event.startsAt.getTime();
    const rule = new RRule({
      freq: FREQ_MAP[event.recurrenceRule.frequency],
      interval: event.recurrenceRule.interval,
      dtstart: event.startsAt,
      until: event.recurrenceRule.until ?? undefined,
      count: event.recurrenceRule.count ?? undefined,
    });

    for (const date of rule.between(rangeStart, rangeEnd, true)) {
      const override = event.overrides.find(
        (o) => o.occurrenceDate.getTime() === date.getTime(),
      );

      if (override?.isCancelled) continue;

      const effectiveStart = override?.startsAt ?? date;
      const effectiveEnd = override?.endsAt ?? new Date(date.getTime() + durationMs);

      results.push({
        ...base,
        ...(override
          ? {
              title: override.title ?? base.title,
              description: override.description ?? base.description,
              allDay: override.allDay ?? base.allDay,
              color: override.color ?? base.color,
              responsibleUserId: override.responsibleUserId ?? base.responsibleUserId,
            }
          : {}),
        startsAt: effectiveStart.toISOString(),
        endsAt: effectiveEnd.toISOString(),
        occurrenceDate: date.toISOString(),
      });
    }
  }

  return results.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
