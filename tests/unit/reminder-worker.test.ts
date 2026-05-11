import { describe, expect, it, vi } from "vitest";
import { markDeliveryOnce } from "@/lib/reminders/worker";

describe("markDeliveryOnce", () => {
  it("returns false when the delivery already exists", async () => {
    const prisma = {
      notificationDelivery: {
        create: vi.fn().mockRejectedValue({ code: "P2002" }),
      },
    };

    await expect(
      markDeliveryOnce(prisma, {
        eventId: "e1",
        reminderRuleId: "r1",
        occurrenceStartsAt: new Date("2026-06-01T10:00:00.000Z"),
        channel: "push",
      }),
    ).resolves.toBe(false);
  });
});
