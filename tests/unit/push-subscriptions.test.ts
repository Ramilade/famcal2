import { describe, expect, it, vi } from "vitest";
import { savePushSubscription } from "@/lib/push/subscriptions";

describe("savePushSubscription", () => {
  it("upserts subscription by endpoint", async () => {
    const prisma = { pushSubscription: { upsert: vi.fn().mockResolvedValue({ id: "p1" }) } };

    await expect(
      savePushSubscription(prisma, "u1", {
        endpoint: "https://push.example/1",
        keys: { p256dh: "key", auth: "auth" },
      }),
    ).resolves.toEqual({ id: "p1" });

    expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: "https://push.example/1" },
      update: { userId: "u1", p256dh: "key", auth: "auth" },
      create: { userId: "u1", endpoint: "https://push.example/1", p256dh: "key", auth: "auth" },
    });
  });
});
