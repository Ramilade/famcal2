import { describe, expect, it } from "vitest";
import { isReminderDue } from "@/lib/reminders/due";

describe("isReminderDue", () => {
  it("returns true when reminder time is inside the worker window", () => {
    expect(
      isReminderDue({
        occurrenceStartsAt: new Date("2026-06-01T10:00:00.000Z"),
        minutesBeforeStart: 30,
        windowStart: new Date("2026-06-01T09:29:00.000Z"),
        windowEnd: new Date("2026-06-01T09:31:00.000Z"),
      }),
    ).toBe(true);
  });
});
