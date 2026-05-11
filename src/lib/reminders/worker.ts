export async function markDeliveryOnce(
  prisma: { notificationDelivery: { create(args: unknown): Promise<unknown> } },
  args: { eventId: string; reminderRuleId: string; occurrenceStartsAt: Date; channel: "in_app" | "push" },
) {
  try {
    await prisma.notificationDelivery.create({ data: args });
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}
