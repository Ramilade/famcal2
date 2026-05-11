import { addDays } from "date-fns";
import { EventForm } from "@/components/calendar/event-form";
import { CalendarShell } from "@/components/calendar/calendar-shell";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPrimaryMembership } from "@/lib/family/membership";

export default async function HomePage() {
  const userId = await requireUserId();
  const membership = await getPrimaryMembership(prisma, userId);

  if (!membership) {
    return <main className="app-shell"><p>Du er ikke medlem af en familie endnu.</p></main>;
  }

  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      familyId: membership.familyId,
      startsAt: { lt: addDays(now, 7) },
      endsAt: { gt: now },
    },
    include: { responsibleUser: true },
    orderBy: { startsAt: "asc" },
  });

  return (
    <main className="app-shell">
      <CalendarShell
        events={events.map((event) => ({
          id: event.id,
          title: event.title,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          color: event.color,
          responsibleName: event.responsibleUser?.name ?? null,
        }))}
      />
      <EventForm />
      <form action="/logout" method="post">
        <button type="submit">Log ud</button>
      </form>
    </main>
  );
}
