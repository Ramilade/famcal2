import { prisma } from "@/lib/db";
import { sendPushNotification } from "@/lib/push/send";
import { RRule } from "rrule";

const FREQ_MAP = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
} as const;

function minuteLabel(min: number): string {
  if (min >= 1440) return "1 dag";
  if (min >= 120) return `${min / 60} timer`;
  if (min === 60) return "1 time";
  return `${min} min`;
}

export async function checkAndSendReminders(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 65_000);
  const windowEnd = new Date(now.getTime() + 65_000);

  const reminders = await prisma.reminderRule.findMany({
    where: { channel: "push" },
    include: {
      event: {
        include: {
          recurrenceRule: true,
          family: {
            include: {
              members: {
                include: { user: { include: { pushSubscriptions: true } } },
              },
            },
          },
        },
      },
    },
  });

  for (const reminder of reminders) {
    const { event } = reminder;
    let occurrenceStart: Date | null = null;

    if (!event.recurrenceRule) {
      const fireAt = new Date(event.startsAt.getTime() - reminder.minutesBeforeStart * 60_000);
      if (fireAt >= windowStart && fireAt < windowEnd) {
        occurrenceStart = event.startsAt;
      }
    } else {
      const lookAhead = new Date(now.getTime() + 24 * 3_600_000 + reminder.minutesBeforeStart * 60_000);
      const rule = new RRule({
        freq: FREQ_MAP[event.recurrenceRule.frequency],
        interval: event.recurrenceRule.interval,
        dtstart: event.startsAt,
        until: event.recurrenceRule.until ?? undefined,
        count: event.recurrenceRule.count ?? undefined,
      });
      for (const occ of rule.between(now, lookAhead, true)) {
        const fireAt = new Date(occ.getTime() - reminder.minutesBeforeStart * 60_000);
        if (fireAt >= windowStart && fireAt < windowEnd) {
          occurrenceStart = occ;
          break;
        }
      }
    }

    if (!occurrenceStart) continue;

    const alreadySent = await prisma.notificationDelivery.findUnique({
      where: {
        eventId_reminderRuleId_occurrenceStartsAt_channel: {
          eventId: event.id,
          reminderRuleId: reminder.id,
          occurrenceStartsAt: occurrenceStart,
          channel: "push",
        },
      },
    });
    if (alreadySent) continue;

    for (const member of event.family.members) {
      for (const sub of member.user.pushSubscriptions) {
        try {
          await sendPushNotification(sub, {
            title: event.title,
            body: `Starter om ${minuteLabel(reminder.minutesBeforeStart)}`,
            url: "/",
          });
        } catch {
          // subscription may be expired — ignore
        }
      }
    }

    try {
      await prisma.notificationDelivery.create({
        data: {
          eventId: event.id,
          reminderRuleId: reminder.id,
          occurrenceStartsAt: occurrenceStart,
          channel: "push",
        },
      });
    } catch {
      // duplicate delivery — ignore
    }
  }
}
