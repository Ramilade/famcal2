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

  // Mon=0 … Sun=6
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
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

export function MonthCalendar({
  year,
  month,
  events,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
}) {
  const router = useRouter();

  const prevMonth = month === 0 ? `${year - 1}-12` : `${year}-${String(month).padStart(2, "0")}`;
  const nextMonth = month === 11 ? `${year + 1}-01` : `${year}-${String(month + 2).padStart(2, "0")}`;

  const grid = buildGrid(year, month);
  const todayKey = toDateKey(new Date());

  // Index events by date key
  const byDay: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const key = toDateKey(new Date(event.startsAt));
    (byDay[key] ??= []).push(event);
  }

  return (
    <section className="month-calendar">
      <header className="cal-nav">
        <button className="cal-nav-btn" onClick={() => router.push(`/?month=${prevMonth}`)}>‹</button>
        <h2 className="cal-title">{MONTH_NAMES[month]} {year}</h2>
        <button className="cal-nav-btn" onClick={() => router.push(`/?month=${nextMonth}`)}>›</button>
      </header>

      <div className="cal-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}

        {grid.map(({ date, currentMonth }, i) => {
          const key = toDateKey(date);
          const dayEvents = byDay[key] ?? [];
          const isToday = key === todayKey;

          return (
            <div key={i} className={`cal-day${currentMonth ? "" : " cal-day--other"}${isToday ? " cal-day--today" : ""}`}>
              <span className="cal-day-num">{date.getDate()}</span>
              <div className="cal-day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="cal-chip"
                    style={{
                      background: `rgb(${hexToRgb(event.color)} / 0.15)`,
                      borderLeft: `3px solid ${event.color}`,
                    }}
                    title={`${event.title}${event.responsibleName ? ` — ${event.responsibleName}` : ""}`}
                  >
                    <span className="cal-chip-title">{event.title}</span>
                    {event.responsibleName && (
                      <span
                        className="cal-chip-avatar"
                        style={{ background: event.color }}
                      >
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
