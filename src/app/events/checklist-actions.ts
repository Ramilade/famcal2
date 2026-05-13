"use server";

import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { requireFamilyAccess } from "@/lib/family/membership";

async function getEventFamily(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { familyId: true } });
  if (!event) throw new Error("Event not found");
  return event.familyId;
}

export async function addChecklistItemAction(
  eventId: string,
  text: string,
): Promise<{ id: string; text: string; checked: boolean }> {
  const userId = await requireUserId();
  const familyId = await getEventFamily(eventId);
  await requireFamilyAccess(prisma, userId, familyId);

  return prisma.checklistItem.create({
    data: { eventId, text: text.trim() },
    select: { id: true, text: true, checked: true },
  });
}

export async function toggleChecklistItemAction(itemId: string): Promise<void> {
  const userId = await requireUserId();
  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: { event: { select: { familyId: true } } },
  });
  if (!item) return;
  await requireFamilyAccess(prisma, userId, item.event.familyId);
  await prisma.checklistItem.update({ where: { id: itemId }, data: { checked: !item.checked } });
}

export async function deleteChecklistItemAction(itemId: string): Promise<void> {
  const userId = await requireUserId();
  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: { event: { select: { familyId: true } } },
  });
  if (!item) return;
  await requireFamilyAccess(prisma, userId, item.event.familyId);
  await prisma.checklistItem.delete({ where: { id: itemId } });
}
