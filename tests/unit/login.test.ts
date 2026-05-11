import { describe, expect, it, vi } from "vitest";
import { verifyLogin } from "@/lib/auth/login";
import { hashPassword } from "@/lib/auth/password";

describe("verifyLogin", () => {
  it("returns the user for valid credentials", async () => {
    const passwordHash = await hashPassword("secret123");
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "u1", email: "a@example.com", name: "A", passwordHash }),
      },
    };

    await expect(verifyLogin(prisma, "a@example.com", "secret123")).resolves.toEqual({
      id: "u1",
      email: "a@example.com",
      name: "A",
    });
  });

  it("returns null for invalid credentials", async () => {
    const passwordHash = await hashPassword("secret123");
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "u1", email: "a@example.com", name: "A", passwordHash }),
      },
    };

    await expect(verifyLogin(prisma, "a@example.com", "wrong")).resolves.toBeNull();
  });
});
