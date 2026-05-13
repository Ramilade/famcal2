import Link from "next/link";
import { redirect } from "next/navigation";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { WeekCalendar } from "@/components/calendar/week-calendar";
import { PushToggle } from "@/components/push/push-toggle";
import { SearchButton } from "@/components/search/search-button";
import { ImportButton } from "@/components/calendar/import-button";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPrimaryMembership } from "@/lib/family/membership";
import { expandEvents } from "@/lib/events/recurrence";
import { ActivityFeed } from "@/components/activity/activity-feed";

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

function parseWeekParam(param: string | undefined): Date {
  if (param) {
    const m = param.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const d = new Date(+m[1], +m[2] - 1, +m[3]);
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
      d.setDate(d.getDate() - dow);
      return d;
    }
  }
  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  now.setDate(now.getDate() - dow);
  now.setHours(0, 0, 0, 0);
  return now;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string; week?: string }>;
}) {
  const userId = await requireUserId();

  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) redirect("/login");

  const membership = await getPrimaryMembership(prisma, userId);
  if (!membership) {
    return (
      <main className="app-shell">
        <p>Du er ikke medlem af en familie endnu.</p>
      </main>
    );
  }

  const { month: monthParam, view, week: weekParam } = await searchParams;
  const isWeekView = view === "week";

  let rangeStart: Date;
  let rangeEnd: Date;
  let year: number;
  let month: number;

  if (isWeekView) {
    const monday = parseWeekParam(weekParam);
    rangeStart = startOfWeek(monday, { weekStartsOn: 1 });
    rangeEnd = endOfWeek(monday, { weekStartsOn: 1 });
    year = 0;
    month = 0;
  } else {
    const parsed = parseMonthParam(monthParam);
    year = parsed.year;
    month = parsed.month;
    rangeStart = startOfMonth(new Date(year, month, 1));
    rangeEnd = endOfMonth(new Date(year, month, 1));
  }

  const [rawEvents, familyMembers] = await Promise.all([
    prisma.event.findMany({
      where: {
        familyId: membership.familyId,
        OR: [
          {
            recurrenceRule: { is: null },
            startsAt: { lte: rangeEnd },
            endsAt: { gte: rangeStart },
          },
          { recurrenceRule: { isNot: null } },
        ],
      },
      include: { responsibleUser: true, createdByUser: true, recurrenceRule: true, reminderRules: true, overrides: true, confirmWithUser: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.familyMember.findMany({
      where: { familyId: membership.familyId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const [family, recentActivity] = await Promise.all([
    prisma.family.findUnique({ where: { id: membership.familyId }, select: { calendarToken: true, backgroundUrl: true } }),
    prisma.activityLog.findMany({
      where: { familyId: membership.familyId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const events = expandEvents(rawEvents, rangeStart, rangeEnd);
  const members = familyMembers.map((m) => ({ id: m.userId, name: m.user.name, color: m.user.defaultColor }));

  const monthHref = isWeekView ? "/calendar" : undefined;
  const weekHref = !isWeekView ? "/calendar?view=week" : undefined;

  const bgStyle = family?.backgroundUrl
    ? family.backgroundUrl.startsWith("http") || family.backgroundUrl.startsWith("/")
      ? `url(${family.backgroundUrl})`
      : family.backgroundUrl
    : null;

  return (
    <main className={`app-shell${bgStyle ? " has-bg" : ""}`}>
      {bgStyle && <div className="page-bg" style={{ backgroundImage: bgStyle }} />}
      <div className="app-topbar">
        <span className="app-logo">FamCal</span>
        <div className="app-topbar-actions">
          <div className="view-toggle">
            <Link
              href={monthHref ?? "/calendar"}
              className={`view-toggle-btn${!isWeekView ? " view-toggle-btn--active" : ""}`}
            >
              Måned
            </Link>
            <Link
              href={weekHref ?? "/calendar?view=week"}
              className={`view-toggle-btn${isWeekView ? " view-toggle-btn--active" : ""}`}
            >
              Uge
            </Link>
          </div>
          <div className="topbar-secondary">
            <SearchButton members={members} currentUserId={userId} />
            <ImportButton />
            <PushToggle />
          </div>
          <div className="topbar-nav">
            <Link href="/dashboard" className="btn-ghost">Forside</Link>
            <Link href="/family" className="btn-ghost">Familie</Link>
            <Link href="/profile" className="btn-ghost">Profil</Link>
            <form action="/logout" method="post">
              <button type="submit" className="btn-ghost">Log ud</button>
            </form>
          </div>
        </div>
      </div>

      <ActivityFeed entries={recentActivity} />

      {isWeekView ? (
        <WeekCalendar
          weekParam={weekParam}
          events={events}
          members={members}
          currentUserId={userId}
        />
      ) : (
        <MonthCalendar year={year} month={month} events={events} members={members} currentUserId={userId} />
      )}
    </main>
  );
}
