"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";
import { getPrimaryMembership } from "@/lib/family/membership";
import { requireFamilyAccess } from "@/lib/family/membership";
import { createEvent } from "@/lib/events/repository";
import { eventInputSchema } from "@/lib/events/schema";
import { notifyFamilyMembers } from "@/lib/push/notify-family";
import { sendPushNotification } from "@/lib/push/send";
import { logActivity } from "@/lib/activity/log";

function parseEventFormData(formData: FormData) {
  const isBirthday = formData.get("isBirthday") === "on";
  const recurrenceEnabled = formData.get("recurrenceEnabled") === "on";

  const recurrence = isBirthday
    ? { frequency: "yearly" as const, interval: 1, until: null }
    : recurrenceEnabled
      ? {
          frequency: String(
            formData.get("recurrenceFrequency") ?? "weekly",
          ) as "daily" | "weekly" | "monthly" | "yearly",
          interval: parseInt(String(formData.get("recurrenceInterval") ?? "1")) || 1,
          until: formData.get("recurrenceUntil")
            ? new Date(String(formData.get("recurrenceUntil"))).toISOString()
            : null,
        }
      : null;

  return eventInputSchema.parse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    startsAt: new Date(String(formData.get("startsAt") ?? "")).toISOString(),
    endsAt: new Date(String(formData.get("endsAt") ?? "")).toISOString(),
    allDay: formData.get("allDay") === "on",
    isBirthday,
    color: String(formData.get("color") ?? "#3B82F6"),
    responsibleUserId: (formData.get("responsibleUserId") as string | null) || null,
    reminders: (() => {
      const mins = parseInt(String(formData.get("reminder") ?? ""));
      return isNaN(mins) || mins <= 0 ? [] : [{ minutesBeforeStart: mins, channel: "push" as const }];
    })(),
    recurrence,
  });
}

export async function createEventAction(formData: FormData) {
  const userId = await requireUserId();
  const membership = await getPrimaryMembership(prisma, userId);
  if (!membership) throw new Error("No family membership found");

  const input = parseEventFormData(formData);
  const needsConfirmation = formData.get("needsConfirmation") === "on";
  const confirmWithUserId = (formData.get("confirmWithUserId") as string | null) || null;

  await createEvent(prisma, { familyId: membership.familyId, createdByUserId: userId, input, needsConfirmation, confirmWithUserId });

  notifyFamilyMembers(membership.familyId, { title: input.title, body: "Ny aftale tilføjet", url: "/" }, userId).catch(() => {});
  logActivity(membership.familyId, userId, "created", "event", "", input.title).catch(() => {});

  if (needsConfirmation && confirmWithUserId) {
    const [creator, targetSubs, creatorSubs, confirmUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.pushSubscription.findMany({ where: { userId: confirmWithUserId } }),
      prisma.pushSubscription.findMany({ where: { userId } }),
      prisma.user.findUnique({ where: { id: confirmWithUserId }, select: { name: true } }),
    ]);
    for (const sub of targetSubs) {
      sendPushNotification(sub, { title: "Afventer din bekræftelse", body: `${creator?.name} vil afklare: ${input.title}`, url: "/" }).catch(() => {});
    }
    for (const sub of creatorSubs) {
      sendPushNotification(sub, { title: "Afklaringsforslag sendt", body: `Afventer svar fra ${confirmUser?.name}: ${input.title}`, url: "/" }).catch(() => {});
    }
  }

  revalidatePath("/");
}

export async function updateEventAction(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const editScope = (String(formData.get("editScope") ?? "all")) as "this" | "future" | "all";
  const occurrenceDateStr = String(formData.get("occurrenceDate") ?? "");

  const existing = await prisma.event.findUnique({
    where: { id },
    select: { familyId: true, recurrenceRule: { select: { id: true, frequency: true, interval: true, until: true, count: true } }, reminderRules: { select: { id: true } } },
  });
  if (!existing) throw new Error("Event not found");

  await requireFamilyAccess(prisma, userId, existing.familyId);

  const input = parseEventFormData(formData);
  const needsConfirmation = formData.get("needsConfirmation") === "on";
  const confirmWithUserId = (formData.get("confirmWithUserId") as string | null) || null;

  if (editScope === "this" && occurrenceDateStr) {
    const occurrenceDate = new Date(occurrenceDateStr);
    await prisma.eventOverride.upsert({
      where: { eventId_occurrenceDate: { eventId: id, occurrenceDate } },
      create: {
        eventId: id,
        occurrenceDate,
        title: input.title,
        description: input.description,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        allDay: input.allDay,
        color: input.color,
        responsibleUserId: input.responsibleUserId ?? null,
      },
      update: {
        title: input.title,
        description: input.description,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        allDay: input.allDay,
        color: input.color,
        responsibleUserId: input.responsibleUserId ?? null,
        isCancelled: false,
      },
    });
  } else if (editScope === "future" && occurrenceDateStr && existing.recurrenceRule) {
    const occurrenceDate = new Date(occurrenceDateStr);
    const newUntil = new Date(occurrenceDate.getTime() - 86_400_000);
    await prisma.event.update({
      where: { id },
      data: { recurrenceRule: { update: { until: newUntil } } },
    });
    await createEvent(prisma, {
      familyId: existing.familyId,
      createdByUserId: userId,
      input: {
        ...input,
        recurrence: input.recurrence ?? {
          frequency: existing.recurrenceRule.frequency,
          interval: existing.recurrenceRule.interval,
          until: null,
        },
      },
      needsConfirmation,
      confirmWithUserId,
    });
  } else {
    await prisma.event.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        allDay: input.allDay,
        isBirthday: input.isBirthday,
        color: input.color,
        responsibleUserId: input.responsibleUserId ?? null,
        needsConfirmation,
        confirmWithUserId,
        reminderRules: {
          deleteMany: {},
          ...(input.reminders.length > 0
            ? { create: input.reminders.map((r) => ({ minutesBeforeStart: r.minutesBeforeStart, channel: r.channel })) }
            : {}),
        },
        recurrenceRule: input.recurrence
          ? existing.recurrenceRule
            ? {
                update: {
                  frequency: input.recurrence.frequency,
                  interval: input.recurrence.interval,
                  until: input.recurrence.until ? new Date(input.recurrence.until) : null,
                },
              }
            : {
                create: {
                  frequency: input.recurrence.frequency,
                  interval: input.recurrence.interval,
                  until: input.recurrence.until ? new Date(input.recurrence.until) : null,
                },
              }
          : existing.recurrenceRule
            ? { delete: true }
            : undefined,
      },
    });
  }

  notifyFamilyMembers(existing.familyId, { title: input.title, body: "Aftale opdateret", url: "/" }, userId).catch(() => {});
  logActivity(existing.familyId, userId, "updated", "event", id, input.title).catch(() => {});

  revalidatePath("/");
}

export async function deleteEventAction(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const deleteScope = (String(formData.get("deleteScope") ?? "all")) as "this" | "future" | "all";
  const occurrenceDateStr = String(formData.get("occurrenceDate") ?? "");

  const existing = await prisma.event.findUnique({
    where: { id },
    select: { familyId: true, recurrenceRule: { select: { id: true } } },
  });
  if (!existing) throw new Error("Event not found");

  await requireFamilyAccess(prisma, userId, existing.familyId);

  const eventForLog = await prisma.event.findUnique({ where: { id }, select: { title: true } });

  if (deleteScope === "this" && occurrenceDateStr) {
    const occurrenceDate = new Date(occurrenceDateStr);
    await prisma.eventOverride.upsert({
      where: { eventId_occurrenceDate: { eventId: id, occurrenceDate } },
      create: { eventId: id, occurrenceDate, isCancelled: true },
      update: { isCancelled: true },
    });
  } else if (deleteScope === "future" && occurrenceDateStr && existing.recurrenceRule) {
    const occurrenceDate = new Date(occurrenceDateStr);
    const newUntil = new Date(occurrenceDate.getTime() - 86_400_000);
    await prisma.event.update({
      where: { id },
      data: { recurrenceRule: { update: { until: newUntil } } },
    });
  } else {
    await prisma.event.delete({ where: { id } });
  }

  if (eventForLog) {
    logActivity(existing.familyId, userId, "deleted", "event", id, eventForLog.title).catch(() => {});
  }

  revalidatePath("/");
}

export async function counterProposeEventAction(eventId: string, startsAt: string, endsAt: string) {
  const userId = await requireUserId();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { familyId: true, title: true, confirmWithUserId: true, createdByUserId: true },
  });
  if (!event || event.confirmWithUserId !== userId) throw new Error("Unauthorized");

  await requireFamilyAccess(prisma, userId, event.familyId);

  const [proposingUser, creatorSubs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.pushSubscription.findMany({ where: { userId: event.createdByUserId } }),
  ]);

  await prisma.event.update({
    where: { id: eventId },
    data: {
      counterProposalStart: new Date(startsAt),
      counterProposalEnd: new Date(endsAt),
    },
  });

  const label = new Date(startsAt).toLocaleString("da-DK", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  for (const sub of creatorSubs) {
    sendPushNotification(sub, {
      title: "Modforslag modtaget",
      body: `${proposingUser?.name} foreslår: ${label} — ${event.title}`,
      url: "/",
    }).catch(() => {});
  }

  revalidatePath("/");
}

export async function acceptCounterProposalAction(eventId: string) {
  const userId = await requireUserId();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      familyId: true, title: true, confirmWithUserId: true, createdByUserId: true,
      counterProposalStart: true, counterProposalEnd: true,
    },
  });
  if (!event || event.createdByUserId !== userId) throw new Error("Unauthorized");
  if (!event.counterProposalStart || !event.counterProposalEnd) throw new Error("No counter-proposal");

  await requireFamilyAccess(prisma, userId, event.familyId);

  const [, confirmWithSubs] = await Promise.all([
    prisma.event.update({
      where: { id: eventId },
      data: {
        startsAt: event.counterProposalStart,
        endsAt: event.counterProposalEnd,
        needsConfirmation: false,
        confirmWithUserId: null,
        counterProposalStart: null,
        counterProposalEnd: null,
      },
    }),
    event.confirmWithUserId
      ? prisma.pushSubscription.findMany({ where: { userId: event.confirmWithUserId } })
      : Promise.resolve([]),
  ]);

  for (const sub of confirmWithSubs) {
    sendPushNotification(sub, {
      title: "Tidspunkt accepteret ✓",
      body: `Dit forslag til "${event.title}" er accepteret`,
      url: "/",
    }).catch(() => {});
  }

  revalidatePath("/");
}

export async function declineCounterProposalAction(eventId: string) {
  const userId = await requireUserId();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { familyId: true, title: true, confirmWithUserId: true, createdByUserId: true },
  });
  if (!event || event.createdByUserId !== userId) throw new Error("Unauthorized");

  await requireFamilyAccess(prisma, userId, event.familyId);

  const [, confirmWithSubs] = await Promise.all([
    prisma.event.update({
      where: { id: eventId },
      data: { counterProposalStart: null, counterProposalEnd: null },
    }),
    event.confirmWithUserId
      ? prisma.pushSubscription.findMany({ where: { userId: event.confirmWithUserId } })
      : Promise.resolve([]),
  ]);

  for (const sub of confirmWithSubs) {
    sendPushNotification(sub, {
      title: "Modforslag afvist",
      body: `Oprindeligt tidspunkt for "${event.title}" fastholdes`,
      url: "/",
    }).catch(() => {});
  }

  revalidatePath("/");
}

export async function confirmEventAction(eventId: string) {
  const userId = await requireUserId();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { familyId: true, title: true, confirmWithUserId: true, createdByUserId: true },
  });
  if (!event || event.confirmWithUserId !== userId) throw new Error("Unauthorized");

  await requireFamilyAccess(prisma, userId, event.familyId);

  const [confirmingUser, creatorSubs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.pushSubscription.findMany({ where: { userId: event.createdByUserId } }),
  ]);

  await prisma.event.update({ where: { id: eventId }, data: { needsConfirmation: false, confirmWithUserId: null } });

  for (const sub of creatorSubs) {
    sendPushNotification(sub, {
      title: "Aftale bekræftet ✓",
      body: `${confirmingUser?.name} har bekræftet: ${event.title}`,
      url: "/",
    }).catch(() => {});
  }

  revalidatePath("/");
}

export async function declineEventAction(eventId: string) {
  const userId = await requireUserId();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { familyId: true, title: true, confirmWithUserId: true, createdByUserId: true },
  });
  if (!event || event.confirmWithUserId !== userId) throw new Error("Unauthorized");

  await requireFamilyAccess(prisma, userId, event.familyId);

  const [decliningUser, creatorSubs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.pushSubscription.findMany({ where: { userId: event.createdByUserId } }),
  ]);

  for (const sub of creatorSubs) {
    sendPushNotification(sub, {
      title: "Aftale afslået",
      body: `${decliningUser?.name} har afslået: ${event.title}`,
      url: "/",
    }).catch(() => {});
  }

  await prisma.event.delete({ where: { id: eventId } });

  revalidatePath("/");
}
