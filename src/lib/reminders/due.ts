export function isReminderDue(args: {
  occurrenceStartsAt: Date;
  minutesBeforeStart: number;
  windowStart: Date;
  windowEnd: Date;
}) {
  const dueAt = new Date(args.occurrenceStartsAt.getTime() - args.minutesBeforeStart * 60_000);
  return dueAt >= args.windowStart && dueAt <= args.windowEnd;
}
