import { describe, expect, it, vi } from "vitest";
import { createEvent } from "@/lib/events/repository";

describe("createEvent", () => {
  it("creates an event scoped to the family and creator", async () => {
    const prisma = { event: { create: vi.fn().mockResolvedValue({ id: "e1" }) } };

    await expect(
      createEvent(prisma, {
        familyId: "f1",
        createdByUserId: "u1",
        input: {
          title: "Fodbold",
          description: "Træning",
          startsAt: "2026-06-01T16:00:00.000Z",
          endsAt: "2026-06-01T17:00:00.000Z",
          allDay: false,
          color: "#16a34a",
          responsibleUserId: "u2",
        },
      }),
    ).resolves.toEqual({ id: "e1" });

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: {
        familyId: "f1",
        createdByUserId: "u1",
        title: "Fodbold",
        description: "Træning",
        startsAt: new Date("2026-06-01T16:00:00.000Z"),
        endsAt: new Date("2026-06-01T17:00:00.000Z"),
        allDay: false,
        color: "#16a34a",
        responsibleUserId: "u2",
      },
    });
  });
});
