import { z } from "zod";

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).default(""),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    allDay: z.boolean().default(false),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    responsibleUserId: z.string().min(1).optional().nullable(),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: "Sluttidspunkt skal være efter starttidspunkt.",
    path: ["endsAt"],
  });

export type EventInput = z.infer<typeof eventInputSchema>;
