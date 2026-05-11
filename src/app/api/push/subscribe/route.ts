import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { savePushSubscription } from "@/lib/push/subscriptions";

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  const body = pushSubscriptionSchema.parse(await request.json());
  await savePushSubscription(prisma, userId, body);
  return NextResponse.json({ ok: true });
}
