"use client";

import { useRouter } from "next/navigation";

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  color: string;
  responsibleName: string | null;
};

const WEEKDAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

const MONTH_NAMES = [
  "Januar", "Februar", "Marts", "April", "Maj", "Juni",
  "Juli", "August", "September", "Oktober", "November", "December",
];

function buildGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const days: { date: Date; currentMonth: boolean }[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), currentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), currentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month + 1, d), currentMonth: false });
  }

  return days;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
}

export function MonthCalendar({ year, month, events }: {
  year: number;
  month: number;
  events: CalendarEvent[];
}) {
  const router = useRouter();

  const prevMonth = month === 0
    ? `${year - 1}-12`
    : `${year}-${String(month).padStart(2, "0")}`;
  const nextMonth = month === 11
    ? `${year + 1}-01`
    : `${year}-${String(month + 2).padStart(2, "0")}`;

  const grid = buildGrid(year, month);
  const todayKey = toDateKey(new Date());

  const byDay: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const key = toDateKey(new Date(event.startsAt));
    (byDay[key] ??= []).push(event);
  }

  return (
    <section className="month-calendar">
      <header className="cal-nav">
        <button className="cal-nav-btn" onClick={() => router.push(`/?month=${prevMonth}`)} aria-label="Forrige måned">‹</button>
        <h2 className="cal-title">{MONTH_NAMES[month]} {year}</h2>
        <button className="cal-nav-btn" onClick={() => router.push(`/?month=${nextMonth}`)} aria-label="Næste måned">›</button>
      </header>

      <div className="cal-grid">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`cal-weekday${i >= 5 ? " cal-weekday--weekend" : ""}`}>{d}</div>
        ))}

        {grid.map(({ date, currentMonth }, i) => {
          const key = toDateKey(date);
          const dayEvents = byDay[key] ?? [];
          const isToday = key === todayKey;
          const dow = (i) % 7; // 0=Mon…6=Sun
          const isWeekend = dow >= 5;

          return (
            <div
              key={i}
              className={[
                "cal-day",
                !currentMonth && "cal-day--other",
                isToday && "cal-day--today",
                isWeekend && "cal-day--weekend",
              ].filter(Boolean).join(" ")}
            >
              <span className="cal-day-num">{date.getDate()}</span>
              <div className="cal-day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="cal-chip"
                    style={{ "--chip-rgb": hexToRgb(event.color), "--chip-color": event.color } as React.CSSProperties}
                    title={`${formatTime(event.startsAt)} ${event.title}${event.responsibleName ? ` — ${event.responsibleName}` : ""}`}
                  >
                    <span className="cal-chip-dot" />
                    <span className="cal-chip-time">{formatTime(event.startsAt)}</span>
                    <span className="cal-chip-title">{event.title}</span>
                    {event.responsibleName && (
                      <span className="cal-chip-avatar" style={{ background: event.color }}>
                        {initials(event.responsibleName)}
                      </span>
                    )}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="cal-chip-more">+{dayEvents.length - 3} mere</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
