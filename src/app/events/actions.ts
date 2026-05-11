"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { getPrimaryMembership } from "@/lib/family/membership";
import { createEvent } from "@/lib/events/repository";

export async function createEventAction(formData: FormData) {
  const userId = await requireUserId();
  const membership = await getPrimaryMembership(prisma, userId);
  if (!membership) throw new Error("No family membership found");

  await createEvent(prisma, {
    familyId: membership.familyId,
    createdByUserId: userId,
    input: {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      startsAt: new Date(String(formData.get("startsAt") ?? "")).toISOString(),
      endsAt: new Date(String(formData.get("endsAt") ?? "")).toISOString(),
      allDay: formData.get("allDay") === "on",
      color: String(formData.get("color") ?? "#2563eb"),
      responsibleUserId: formData.get("responsibleUserId") as string | null,
      reminders: [],
    },
  });

  redirect("/");
}
