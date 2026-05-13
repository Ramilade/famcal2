"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { requireFamilyAccess } from "@/lib/family/membership";
import bcrypt from "bcryptjs";

export async function generateInviteAction(familyId: string): Promise<string | null> {
  const userId = await requireUserId();
  const membership = await requireFamilyAccess(prisma, userId, familyId);
  if (membership.role !== "admin") return null;

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
  const invite = await prisma.inviteToken.create({
    data: { familyId, createdBy: userId, expiresAt },
  });
  return invite.token;
}

export async function joinFamilyAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) return { error: "Alle felter er påkrævet" };
  if (password.length < 6) return { error: "Adgangskode skal være mindst 6 tegn" };

  const invite = await prisma.inviteToken.findUnique({ where: { token } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return { error: "Invitationslinket er ugyldigt eller udløbet" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "En bruger med denne email eksisterer allerede" };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.create({
      data: { name, email, passwordHash, memberships: { create: { familyId: invite.familyId } } },
    }),
    prisma.inviteToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  revalidatePath("/family");
  redirect("/login");
}

export async function addMemberAction(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string } | null> {
  const userId = await requireUserId();
  const familyId = String(formData.get("familyId") ?? "");

  const membership = await requireFamilyAccess(prisma, userId, familyId);
  if (membership.role !== "admin") return { error: "Kun admins kan tilføje medlemmer" };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) return { error: "Alle felter er påkrævet" };
  if (password.length < 6) return { error: "Adgangskode skal være mindst 6 tegn" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const alreadyMember = await prisma.familyMember.findFirst({
      where: { userId: existing.id, familyId },
    });
    if (alreadyMember) return { error: "Denne bruger er allerede i familien" };
    await prisma.familyMember.create({ data: { userId: existing.id, familyId } });
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        memberships: { create: { familyId } },
      },
    });
  }

  revalidatePath("/family");
  return { success: `${name} er tilføjet til familien` };
}

export async function updateMemberColorAction(formData: FormData) {
  const userId = await requireUserId();
  const targetUserId = String(formData.get("userId") ?? "");
  const familyId = String(formData.get("familyId") ?? "");
  const color = String(formData.get("color") ?? "");

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;

  const membership = await requireFamilyAccess(prisma, userId, familyId);
  if (targetUserId !== userId && membership.role !== "admin") return;

  const targetMembership = await prisma.familyMember.findFirst({
    where: { userId: targetUserId, familyId },
  });
  if (!targetMembership) return;

  await prisma.user.update({ where: { id: targetUserId }, data: { defaultColor: color } });
  revalidatePath("/family");
  revalidatePath("/");
}

export async function updateFamilyBackgroundAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const familyId = String(formData.get("familyId") ?? "");
  await requireFamilyAccess(prisma, userId, familyId);

  const backgroundUrl = String(formData.get("backgroundUrl") ?? "").trim() || null;
  await prisma.family.update({ where: { id: familyId }, data: { backgroundUrl } });

  revalidatePath("/");
  revalidatePath("/family");
}

export async function removeMemberAction(formData: FormData) {
  const userId = await requireUserId();
  const familyMemberId = String(formData.get("familyMemberId") ?? "");

  const target = await prisma.familyMember.findUnique({
    where: { id: familyMemberId },
    select: { familyId: true, userId: true },
  });
  if (!target) throw new Error("Medlem ikke fundet");

  const membership = await requireFamilyAccess(prisma, userId, target.familyId);
  if (membership.role !== "admin") throw new Error("Kun admins kan fjerne medlemmer");
  if (target.userId === userId) throw new Error("Du kan ikke fjerne dig selv");

  await prisma.familyMember.delete({ where: { id: familyMemberId } });
  revalidatePath("/family");
}
