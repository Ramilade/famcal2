import { describe, expect, it } from "vitest";
import { eventInputSchema } from "@/lib/events/schema";

describe("eventInputSchema", () => {
  it("accepts a valid event", () => {
    const result = eventInputSchema.safeParse({
      title: "Fodbold",
      description: "Træning",
      startsAt: "2026-06-01T16:00:00.000Z",
      endsAt: "2026-06-01T17:00:00.000Z",
      allDay: false,
      color: "#16a34a",
      responsibleUserId: "u1",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an event that ends before it starts", () => {
    const result = eventInputSchema.safeParse({
      title: "Bad",
      description: "",
      startsAt: "2026-06-01T17:00:00.000Z",
      endsAt: "2026-06-01T16:00:00.000Z",
      allDay: false,
      color: "#16a34a",
    });

    expect(result.success).toBe(false);
  });
});
