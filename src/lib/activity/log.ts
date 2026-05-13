import { prisma } from "@/lib/db";

export async function logActivity(
  familyId: string,
  userId: string,
  action: "created" | "updated" | "deleted",
  entityType: "event",
  entityId: string,
  entityName: string,
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { familyId, userId, action, entityType, entityId, entityName },
    });
  } catch {
    // Non-critical — never fail the caller
  }
}
