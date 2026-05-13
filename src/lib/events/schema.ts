import { z } from "zod";

export const reminderInputSchema = z.object({
  minutesBeforeStart: z.number().int().min(0).max(10_080),
  channel: z.enum(["in_app", "push"]),
});

export const recurrenceInputSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().min(1).max(365).default(1),
  until: z.string().datetime().optional().nullable(),
});

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).default(""),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    allDay: z.boolean().default(false),
    isBirthday: z.boolean().default(false),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    responsibleUserId: z.string().min(1).optional().nullable(),
    reminders: z.array(reminderInputSchema).default([]),
    recurrence: recurrenceInputSchema.optional().nullable(),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: "Sluttidspunkt skal være efter starttidspunkt.",
    path: ["endsAt"],
  });

export type EventInput = z.infer<typeof eventInputSchema>;
export type RecurrenceInput = z.infer<typeof recurrenceInputSchema>;
