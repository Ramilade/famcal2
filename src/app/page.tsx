import { startOfMonth, endOfMonth } from "date-fns";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { EventForm } from "@/components/calendar/event-form";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPrimaryMembership } from "@/lib/family/membership";

function parseMonthParam(param: string | undefined): { year: number; month: number } {
  if (param) {
    const match = param.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      if (month >= 0 && month <= 11) return { year, month };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const membership = await getPrimaryMembership(prisma, userId);

  if (!membership) {
    return <main className="app-shell"><p>Du er ikke medlem af en familie endnu.</p></main>;
  }

  const { month: monthParam } = await searchParams;
  const { year, month } = parseMonthParam(monthParam);

  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(new Date(year, month, 1));

  const events = await prisma.event.findMany({
    where: {
      familyId: membership.familyId,
      startsAt: { lte: monthEnd },
      endsAt: { gte: monthStart },
    },
    include: { responsibleUser: true },
    orderBy: { startsAt: "asc" },
  });

  return (
    <main className="app-shell">
      <div className="app-topbar">
        <span className="app-logo">FamCal</span>
        <form action="/logout" method="post">
          <button type="submit" className="btn-ghost">Log ud</button>
        </form>
      </div>

      <MonthCalendar
        year={year}
        month={month}
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          startsAt: e.startsAt.toISOString(),
          color: e.color,
          responsibleName: e.responsibleUser?.name ?? null,
        }))}
      />

      <EventForm />
    </main>
  );
}
