import { prisma } from "@/lib/db";
import { sendPushNotification } from "@/lib/push/send";
import { RRule } from "rrule";

const FREQ_MAP = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
} as const;

export async function checkAndSendDailyDigest(): Promise<void> {
  const now = new Date();
  if (now.getHours() !== 7 || now.getMinutes() > 1) return;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateKey = today.toISOString().slice(0, 10);

  const families = await prisma.family.findMany({
    include: {
      members: {
        include: { user: { include: { pushSubscriptions: true } } },
      },
      events: {
        where: {
          OR: [
            { recurrenceRule: { is: null }, startsAt: { gte: today, lt: tomorrow } },
            { recurrenceRule: { isNot: null } },
          ],
        },
        include: { recurrenceRule: true },
      },
    },
  });

  for (const family of families) {
    const todayTitles: string[] = [];

    for (const event of family.events) {
      if (!event.recurrenceRule) {
        todayTitles.push(event.title);
        continue;
      }
      const rule = new RRule({
        freq: FREQ_MAP[event.recurrenceRule.frequency],
        interval: event.recurrenceRule.interval,
        dtstart: event.startsAt,
        until: event.recurrenceRule.until ?? undefined,
        count: event.recurrenceRule.count ?? undefined,
      });
      if (rule.between(today, tomorrow, true).length > 0) {
        todayTitles.push(event.title);
      }
    }

    for (const member of family.members) {
      const alreadySent = await prisma.dailyDigestDelivery.findUnique({
        where: { userId_date: { userId: member.userId, date: dateKey } },
      });
      if (alreadySent) continue;

      const pendingCount = await prisma.event.count({
        where: { familyId: family.id, needsConfirmation: true, confirmWithUserId: member.userId },
      });

      if (todayTitles.length === 0 && pendingCount === 0) continue;

      let title: string;
      let body: string;

      if (todayTitles.length > 0) {
        title = `📅 ${todayTitles.length} aftale${todayTitles.length !== 1 ? "r" : ""} i dag`;
        body = todayTitles.slice(0, 3).join(", ");
        if (pendingCount > 0) {
          body += `. Du har ${pendingCount} aftale${pendingCount !== 1 ? "r" : ""} til afklaring`;
        }
      } else {
        title = "📅 Afklaring påkrævet";
        body = `Du har ${pendingCount} aftale${pendingCount !== 1 ? "r" : ""} som afventer din bekræftelse`;
      }

      for (const sub of member.user.pushSubscriptions) {
        try {
          await sendPushNotification(sub, { title, body, url: "/" });
        } catch {
          // expired subscription
        }
      }

      try {
        await prisma.dailyDigestDelivery.create({
          data: { userId: member.userId, date: dateKey },
        });
      } catch {
        // duplicate — ignore
      }
    }
  }
}
