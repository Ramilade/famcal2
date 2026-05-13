"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function updateProfileAction(
  _prev: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const currentPassword = String(formData.get("currentPassword") ?? "");

  if (!name || !email) return { error: "Navn og email er påkrævet" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Bruger ikke fundet" };

  const changed = name !== user.name || email !== user.email;
  if (changed) {
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) return { error: "Forkert nuværende kodeord" };
  }

  if (email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) return { error: "Denne email er allerede i brug" };
  }

  await prisma.user.update({ where: { id: userId }, data: { name, email } });
  revalidatePath("/profile");
  revalidatePath("/");
  return { success: "Profil opdateret" };
}

export async function updatePasswordAction(
  _prev: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const userId = await requireUserId();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) return { error: "Alle felter er påkrævet" };
  if (newPassword.length < 6) return { error: "Nyt kodeord skal være mindst 6 tegn" };
  if (newPassword !== confirmPassword) return { error: "Kodeordene matcher ikke" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Bruger ikke fundet" };

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return { error: "Forkert nuværende kodeord" };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { success: "Kodeord opdateret" };
}
