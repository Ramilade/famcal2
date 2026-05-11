import { describe, expect, it, vi } from "vitest";
import { getPrimaryMembership, requireFamilyAccess } from "@/lib/family/membership";

describe("family membership", () => {
  it("returns the user's first membership", async () => {
    const prisma = {
      familyMember: {
        findFirst: vi.fn().mockResolvedValue({ id: "m1", userId: "u1", familyId: "f1", role: "admin" }),
      },
    };

    await expect(getPrimaryMembership(prisma, "u1")).resolves.toEqual({
      id: "m1",
      userId: "u1",
      familyId: "f1",
      role: "admin",
    });
  });

  it("throws when a user is not in the requested family", async () => {
    const prisma = { familyMember: { findFirst: vi.fn().mockResolvedValue(null) } };

    await expect(requireFamilyAccess(prisma, "u1", "f1")).rejects.toThrow("Family access denied");
  });
});
