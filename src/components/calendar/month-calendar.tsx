"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventModal } from "./event-modal";
import { DayView } from "./day-view";
import type { CalendarEventData } from "@/lib/events/recurrence";

export type CalendarEvent = CalendarEventData;
export type Member = { id: string; name: string; color: string };

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
  return new Date(iso).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
}

type ModalState =
  | { type: "create"; dateKey: string }
  | { type: "edit"; event: CalendarEvent }
  | null;

export function MonthCalendar({
  year,
  month,
  events,
  members,
  currentUserId,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [dayView, setDayView] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const prevMonth =
    month === 0 ? `${year - 1}-12` : `${year}-${String(month).padStart(2, "0")}`;
  const nextMonth =
    month === 11 ? `${year + 1}-01` : `${year}-${String(month + 2).padStart(2, "0")}`;

  const grid = buildGrid(year, month);
  const todayKey = toDateKey(new Date());

  const filteredEvents = activeFilter
    ? events.filter((e) => !e.responsibleUserId || e.responsibleUserId === activeFilter)
    : events;

  const byDay: Record<string, CalendarEvent[]> = {};
  for (const event of filteredEvents) {
    const key = toDateKey(new Date(event.startsAt));
    (byDay[key] ??= []).push(event);
  }

  const memberColorMap = Object.fromEntries(members.map((m) => [m.id, m.color]));

  return (
    <section className="month-calendar">
      <header className="cal-nav">
        <button
          className="cal-nav-btn"
          onClick={() => router.push(`/calendar?month=${prevMonth}`)}
          aria-label="Forrige måned"
        >
          ‹
        </button>
        <h2 className="cal-title">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          className="cal-nav-btn"
          onClick={() => router.push(`/calendar?month=${nextMonth}`)}
          aria-label="Næste måned"
        >
          ›
        </button>
      </header>

      {members.length > 1 && (
        <div className="cal-filter">
          <button
            className={`cal-filter-btn${activeFilter === null ? " cal-filter-btn--active" : ""}`}
            onClick={() => setActiveFilter(null)}
          >
            Alle
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              className={`cal-filter-btn${activeFilter === m.id ? " cal-filter-btn--active" : ""}`}
              style={activeFilter === m.id ? { background: m.color, borderColor: m.color, color: "white" } : { borderColor: m.color, color: m.color }}
              onClick={() => setActiveFilter(activeFilter === m.id ? null : m.id)}
            >
              {m.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      <div className="cal-grid">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`cal-weekday${i >= 5 ? " cal-weekday--weekend" : ""}`}
          >
            {d}
          </div>
        ))}

        {grid.map(({ date, currentMonth }, i) => {
          const key = toDateKey(date);
          const dayEvents = byDay[key] ?? [];
          const isToday = key === todayKey;
          const dow = i % 7;
          const isWeekend = dow >= 5;

          return (
            <div
              key={i}
              className={[
                "cal-day",
                !currentMonth && "cal-day--other",
                isToday && "cal-day--today",
                isWeekend && "cal-day--weekend",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setDayView(key)}
            >
              <span className="cal-day-num">{date.getDate()}</span>
              <div className="cal-day-events">
                {dayEvents.slice(0, 3).map((event) => {
                  const chipColor = event.isBirthday ? "#A855F7" : event.color;
                  return (
                    <div
                      key={`${event.id}-${event.startsAt}`}
                      className={`cal-chip${event.isBirthday ? " cal-chip--birthday" : ""}`}
                      style={
                        {
                          "--chip-rgb": hexToRgb(chipColor),
                          "--chip-color": chipColor,
                        } as React.CSSProperties
                      }
                      title={[
                        `${event.isBirthday ? "🎂 " : ""}${event.allDay ? "Hele dagen" : formatTime(event.startsAt)}  ${event.title}`,
                        event.description || null,
                        event.responsibleName ? `Ansvarlig: ${event.responsibleName}` : null,
                      ].filter(Boolean).join("\n")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal({ type: "edit", event });
                      }}
                    >
                      {event.isBirthday && <span style={{ fontSize: "0.65rem" }}>🎂</span>}
                      {!event.isBirthday && <span className="cal-chip-dot" />}
                      <span className="cal-chip-time">{formatTime(event.startsAt)}</span>
                      <span className="cal-chip-title">{event.title}</span>
                      {event.responsibleUserId && event.responsibleName && (
                        <span
                          className="cal-chip-avatar"
                          style={{
                            background:
                              memberColorMap[event.responsibleUserId] ?? event.color,
                          }}
                        >
                          {initials(event.responsibleName)}
                        </span>
                      )}
                      {event.isRecurring && !event.isBirthday && (
                        <span className="cal-chip-recurring">↻</span>
                      )}
                      {event.needsConfirmation && (
                        <span className="cal-chip-pending">?</span>
                      )}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div
                    className="cal-chip-more"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDayView(key);
                    }}
                  >
                    +{dayEvents.length - 3} mere
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {dayView && (
        <DayView
          dateKey={dayView}
          events={byDay[dayView] ?? []}
          members={members}
          onCreateEvent={(dk) => {
            setDayView(null);
            setModal({ type: "create", dateKey: dk });
          }}
          onEditEvent={(event) => {
            setDayView(null);
            setModal({ type: "edit", event });
          }}
          onClose={() => setDayView(null)}
        />
      )}

      {modal &&
        (modal.type === "create" ? (
          <EventModal
            mode="create"
            dateKey={modal.dateKey}
            members={members}
            currentUserId={currentUserId}
            onClose={() => setModal(null)}
          />
        ) : (
          <EventModal
            mode="edit"
            event={modal.event}
            members={members}
            currentUserId={currentUserId}
            onClose={() => setModal(null)}
          />
        ))}
    </section>
  );
}
