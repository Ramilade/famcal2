import { ReminderChannel } from "@prisma/client";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/db";
import { isReminderDue } from "@/lib/reminders/due";
import { markDeliveryOnce } from "@/lib/reminders/worker";
import { sendPushNotification } from "@/lib/push/send";

async function tick() {
  const windowStart = new Date();
  const windowEnd = addMinutes(windowStart, 1);
  const reminderRules = await prisma.reminderRule.findMany({
    where: { channel: ReminderChannel.push },
    include: {
      event: {
        include: {
          family: {
            include: {
              members: { include: { user: { include: { pushSubscriptions: true } } } },
            },
          },
        },
      },
    },
  });

  for (const reminder of reminderRules) {
    const occurrenceStartsAt = reminder.event.startsAt;
    if (!isReminderDue({ occurrenceStartsAt, minutesBeforeStart: reminder.minutesBeforeStart, windowStart, windowEnd })) {
      continue;
    }

    const shouldSend = await markDeliveryOnce(prisma, {
      eventId: reminder.eventId,
      reminderRuleId: reminder.id,
      occurrenceStartsAt,
      channel: "push",
    });

    if (!shouldSend) continue;

    for (const member of reminder.event.family.members) {
      for (const subscription of member.user.pushSubscriptions) {
        try {
          await sendPushNotification(subscription, {
            title: reminder.event.title,
            body: `Starter ${occurrenceStartsAt.toLocaleString("da-DK")}`,
            url: "/",
          });
        } catch (error) {
          const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? error.statusCode : null;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: subscription.id } });
          } else {
            console.error("[reminders] push failed", error);
          }
        }
      }
    }
  }
}

async function main() {
  await tick();
  setInterval(() => {
    tick().catch((error) => console.error("[reminders] tick failed", error));
  }, 60_000);
}

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
