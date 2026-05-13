"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventModal } from "./event-modal";
import type { CalendarEvent, Member } from "./month-calendar";

const WEEKDAYS_SHORT = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_PX = 56;
const DAY_START = 0;

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateParam(param: string | undefined): Date {
  if (param) {
    const m = param.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return getMondayOf(new Date(+m[1], +m[2] - 1, +m[3]));
  }
  return getMondayOf(new Date());
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function minutesSinceMidnight(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTimeShort(iso: string) {
  return new Date(iso).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

type ModalState =
  | { type: "create"; dateKey: string }
  | { type: "edit"; event: CalendarEvent }
  | null;

export function WeekCalendar({
  weekParam,
  events,
  members,
  currentUserId,
}: {
  weekParam: string | undefined;
  events: CalendarEvent[];
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const monday = parseDateParam(weekParam);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const prevWeek = (() => {
    const d = new Date(monday);
    d.setDate(d.getDate() - 7);
    return dateKey(d);
  })();
  const nextWeek = (() => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 7);
    return dateKey(d);
  })();

  const todayKey = toDateKey(new Date());

  const filteredEvents = activeFilter
    ? events.filter((e) => !e.responsibleUserId || e.responsibleUserId === activeFilter)
    : events;

  const byDay: Record<string, CalendarEvent[]> = {};
  const allDayByDay: Record<string, CalendarEvent[]> = {};
  for (const event of filteredEvents) {
    const key = toDateKey(new Date(event.startsAt));
    if (event.allDay) {
      (allDayByDay[key] ??= []).push(event);
    } else {
      (byDay[key] ??= []).push(event);
    }
  }

  const weekLabel = (() => {
    const end = days[6];
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return `${monday.toLocaleDateString("da-DK", opts)} – ${end.toLocaleDateString("da-DK", opts)} ${end.getFullYear()}`;
  })();

  return (
    <section className="week-calendar">
      <header className="cal-nav">
        <button
          className="cal-nav-btn"
          onClick={() => router.push(`/calendar?view=week&week=${prevWeek}`)}
          aria-label="Forrige uge"
        >
          ‹
        </button>
        <h2 className="cal-title">{weekLabel}</h2>
        <button
          className="cal-nav-btn"
          onClick={() => router.push(`/calendar?view=week&week=${nextWeek}`)}
          aria-label="Næste uge"
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
              style={
                activeFilter === m.id
                  ? { background: m.color, borderColor: m.color, color: "white" }
                  : { borderColor: m.color, color: m.color }
              }
              onClick={() => setActiveFilter(activeFilter === m.id ? null : m.id)}
            >
              {m.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      <div className="week-grid">
        {/* Day headers */}
        <div className="week-time-gutter" />
        {days.map((day, i) => {
          const key = dateKey(day);
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`week-day-header${isToday ? " week-day-header--today" : ""}${i >= 5 ? " week-day-header--weekend" : ""}`}
              onClick={() => setModal({ type: "create", dateKey: key })}
            >
              <span className="week-day-name">{WEEKDAYS_SHORT[i]}</span>
              <span className={`week-day-num${isToday ? " week-day-num--today" : ""}`}>
                {day.getDate()}
              </span>
            </div>
          );
        })}

        {/* All-day row */}
        <div className="week-allday-row">
          <div className="week-allday-label">Hel dag</div>
          {days.map((day, i) => {
            const key = dateKey(day);
            const dayAllDay = allDayByDay[key] ?? [];
            return (
              <div key={key} className="week-allday-cell">
                {dayAllDay.map((event) => {
                  const chipColor = event.isBirthday ? "#A855F7" : event.color;
                  return (
                    <button
                      key={`${event.id}-${event.startsAt}`}
                      className="week-allday-chip"
                      style={{ "--chip-color": chipColor } as React.CSSProperties}
                      onClick={(e) => { e.stopPropagation(); setModal({ type: "edit", event }); }}
                      title={event.title}
                    >
                      {event.isBirthday ? "🎂 " : ""}{event.title}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Time slots + events */}
        <div className="week-body">
          {/* Time gutter */}
          <div className="week-time-col">
            {HOURS.map((h) => (
              <div key={h} className="week-hour-label" style={{ top: (h - DAY_START) * HOUR_PX }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, colIdx) => {
            const key = dateKey(day);
            const dayEvents = byDay[key] ?? [];
            const isToday = key === todayKey;

            return (
              <div
                key={key}
                className={`week-day-col${isToday ? " week-day-col--today" : ""}${colIdx >= 5 ? " week-day-col--weekend" : ""}`}
                onClick={() => setModal({ type: "create", dateKey: key })}
                style={{ height: 24 * HOUR_PX }}
              >
                {HOURS.map((h) => (
                  <div key={h} className="week-hour-line" style={{ top: h * HOUR_PX }} />
                ))}

                {dayEvents.map((event) => {
                  const startMin = minutesSinceMidnight(event.startsAt);
                  const endMin = minutesSinceMidnight(event.endsAt);
                  const duration = Math.max(endMin - startMin, 30);
                  const chipColor = event.isBirthday ? "#A855F7" : event.color;
                  return (
                    <div
                      key={`${event.id}-${event.startsAt}`}
                      className="week-event"
                      style={{
                        top: (startMin / 60) * HOUR_PX,
                        height: Math.max((duration / 60) * HOUR_PX, 24),
                        background: `rgb(${hexToRgb(chipColor)} / 0.15)`,
                        borderLeftColor: chipColor,
                      }}
                      title={[
                        `${event.allDay ? "Hele dagen" : formatTimeShort(event.startsAt)}  ${event.title}`,
                        event.description || null,
                      ].filter(Boolean).join("\n")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal({ type: "edit", event });
                      }}
                    >
                      <span className="week-event-time">{formatTimeShort(event.startsAt)}</span>
                      <span className="week-event-title">
                        {event.isBirthday && "🎂 "}
                        {event.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

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
