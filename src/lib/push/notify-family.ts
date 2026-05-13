import { prisma } from "@/lib/db";
import { sendPushNotification } from "./send";

export async function notifyFamilyMembers(
  familyId: string,
  payload: { title: string; body: string; url: string },
  excludeUserId?: string,
): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      user: { memberships: { some: { familyId } } },
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
  });
  await Promise.allSettled(subscriptions.map((sub) => sendPushNotification(sub, payload)));
}
