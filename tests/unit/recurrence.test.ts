import { describe, expect, it } from "vitest";
import { expandRecurringEvent } from "@/lib/events/recurrence";

describe("expandRecurringEvent", () => {
  it("expands a weekly event within a date range", () => {
    const occurrences = expandRecurringEvent({
      event: {
        id: "e1",
        startsAt: new Date("2026-06-01T10:00:00.000Z"),
        endsAt: new Date("2026-06-01T11:00:00.000Z"),
      },
      recurrenceRule: { frequency: "weekly", interval: 1, until: new Date("2026-06-30T23:59:59.000Z"), count: null },
      rangeStart: new Date("2026-06-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-06-30T23:59:59.000Z"),
    });

    expect(occurrences.map((item) => item.startsAt.toISOString())).toEqual([
      "2026-06-01T10:00:00.000Z",
      "2026-06-08T10:00:00.000Z",
      "2026-06-15T10:00:00.000Z",
      "2026-06-22T10:00:00.000Z",
      "2026-06-29T10:00:00.000Z",
    ]);
  });
});
