import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPrimaryMembership } from "@/lib/family/membership";
import { expandEvents } from "@/lib/events/recurrence";
import { PendingCard } from "./pending-card";

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDayLabel(dateKey: string, todayKey: string, tomorrowKey: string) {
  if (dateKey === todayKey) return "I dag";
  if (dateKey === tomorrowKey) return "I morgen";
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const label = date.toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "God morgen";
  if (h >= 12 && h < 18) return "God eftermiddag";
  return "God aften";
}

export default async function DashboardPage() {
  const userId = await requireUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!user) redirect("/login");

  const membership = await getPrimaryMembership(prisma, userId);
  if (!membership) {
    return (
      <main className="app-shell">
        <p>Du er ikke medlem af en familie endnu.</p>
      </main>
    );
  }

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rangeEnd = new Date(rangeStart.getTime() + 14 * 24 * 60 * 60 * 1000);
  rangeEnd.setHours(23, 59, 59, 999);

  const [rawEvents, pendingConfirmations, counterProposals] = await Promise.all([
    prisma.event.findMany({
      where: {
        familyId: membership.familyId,
        OR: [
          { recurrenceRule: { is: null }, startsAt: { gte: rangeStart, lte: rangeEnd } },
          { recurrenceRule: { isNot: null } },
        ],
      },
      include: {
        responsibleUser: true,
        createdByUser: true,
        recurrenceRule: true,
        reminderRules: true,
        overrides: true,
        confirmWithUser: true,
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.event.findMany({
      where: { familyId: membership.familyId, needsConfirmation: true, confirmWithUserId: userId },
      include: { createdByUser: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.event.findMany({
      where: {
        familyId: membership.familyId,
        needsConfirmation: true,
        createdByUserId: userId,
        counterProposalStart: { not: null },
      },
      include: { confirmWithUser: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const upcoming = expandEvents(rawEvents, rangeStart, rangeEnd);

  const todayKey = toDateKey(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrowDate);

  const byDay: Record<string, typeof upcoming> = {};
  for (const event of upcoming) {
    const key = toDateKey(new Date(event.startsAt));
    (byDay[key] ??= []).push(event);
  }
  const sortedDays = Object.keys(byDay).sort();

  const greeting = getGreeting();
  const todayLabel = now
    .toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());

  const hasActions = pendingConfirmations.length > 0 || counterProposals.length > 0;

  return (
    <main className="app-shell">
      <div className="app-topbar">
        <span className="app-logo">FamCal</span>
        <div className="app-topbar-actions">
          <Link href="/" className="btn-ghost">📅 Kalender</Link>
          <Link href="/family" className="btn-ghost">Familie</Link>
          <Link href="/profile" className="btn-ghost">Profil</Link>
          <form action="/logout" method="post">
            <button type="submit" className="btn-ghost">Log ud</button>
          </form>
        </div>
      </div>

      <div className="dashboard-greeting">
        <div>
          <h1 className="dashboard-greeting-title">
            {greeting}, {user.name.split(" ")[0]}
          </h1>
          <p className="dashboard-greeting-date">{todayLabel}</p>
        </div>
      </div>

      {hasActions && (
        <section className="dashboard-section">
          <h2 className="dashboard-section-title">Kræver handling</h2>
          <div className="dashboard-action-list">
            {pendingConfirmations.map((e) => (
              <PendingCard
                key={e.id}
                eventId={e.id}
                title={e.title}
                startsAt={e.startsAt.toISOString()}
                endsAt={e.endsAt.toISOString()}
                allDay={e.allDay}
                color={e.color}
                createdByName={e.createdByUser.name}
                type="needs-confirmation"
              />
            ))}
            {counterProposals.map((e) => (
              <PendingCard
                key={e.id}
                eventId={e.id}
                title={e.title}
                startsAt={e.startsAt.toISOString()}
                endsAt={e.endsAt.toISOString()}
                allDay={e.allDay}
                color={e.color}
                confirmWithName={e.confirmWithUser?.name ?? null}
                counterProposalStart={e.counterProposalStart?.toISOString() ?? null}
                counterProposalEnd={e.counterProposalEnd?.toISOString() ?? null}
                type="counter-proposal"
              />
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">Kommende aftaler</h2>
          <Link href="/" className="dashboard-see-all">Se kalender →</Link>
        </div>

        {sortedDays.length === 0 ? (
          <div className="dashboard-empty">Ingen kommende aftaler de næste 14 dage</div>
        ) : (
          sortedDays.map((dayKey) => (
            <div key={dayKey} className="dashboard-day-group">
              <div className="dashboard-day-label">{getDayLabel(dayKey, todayKey, tomorrowKey)}</div>
              <div className="dashboard-day-events">
                {byDay[dayKey].map((event) => {
                  const timeLabel = event.allDay
                    ? "Hele dagen"
                    : new Date(event.startsAt).toLocaleTimeString("da-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                  const chipColor = event.isBirthday ? "#A855F7" : event.color;
                  return (
                    <Link
                      key={`${event.id}-${event.startsAt}`}
                      href={`/?month=${dayKey.slice(0, 7)}`}
                      className="dashboard-event-row"
                      style={{ "--chip-color": chipColor } as React.CSSProperties}
                    >
                      <span className="dashboard-event-bar" />
                      <span className="dashboard-event-time">{timeLabel}</span>
                      <span className="dashboard-event-title">
                        {event.isBirthday && "🎂 "}
                        {event.title}
                        {event.needsConfirmation && (
                          <span className="dashboard-event-pending"> ?</span>
                        )}
                      </span>
                      {event.responsibleName && (
                        <span className="dashboard-event-person">{event.responsibleName}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
