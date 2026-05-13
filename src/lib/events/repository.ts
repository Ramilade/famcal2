import { EventInput, eventInputSchema } from "./schema";

type EventPrisma = {
  event: {
    create(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
    update(args: unknown): Promise<unknown>;
    delete(args: unknown): Promise<unknown>;
  };
};

export async function createEvent(
  prisma: Pick<EventPrisma, "event">,
  args: {
    familyId: string;
    createdByUserId: string;
    input: EventInput;
    needsConfirmation?: boolean;
    confirmWithUserId?: string | null;
  },
) {
  const input = eventInputSchema.parse(args.input);
  return prisma.event.create({
    data: {
      familyId: args.familyId,
      createdByUserId: args.createdByUserId,
      title: input.title,
      description: input.description,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      allDay: input.allDay,
      isBirthday: input.isBirthday,
      color: input.color,
      responsibleUserId: input.responsibleUserId ?? null,
      needsConfirmation: args.needsConfirmation ?? false,
      confirmWithUserId: args.confirmWithUserId ?? null,
      reminderRules: {
        create: input.reminders.map((reminder) => ({
          minutesBeforeStart: reminder.minutesBeforeStart,
          channel: reminder.channel,
        })),
      },
      ...(input.recurrence
        ? {
            recurrenceRule: {
              create: {
                frequency: input.recurrence.frequency,
                interval: input.recurrence.interval,
                until: input.recurrence.until ? new Date(input.recurrence.until) : null,
              },
            },
          }
        : {}),
    },
  });
}
