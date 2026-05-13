"use client";

import { useEffect } from "react";
import type { CalendarEvent, Member } from "./month-calendar";

type Props = {
  dateKey: string;
  events: CalendarEvent[];
  members: Member[];
  onCreateEvent: (dateKey: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
  onClose: () => void;
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
}

function formatTimeRange(startsAt: string, endsAt: string, allDay: boolean) {
  if (allDay) return "Hele dagen";
  return `${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

export function DayView({ dateKey, events, onCreateEvent, onEditEvent, onClose }: Props) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dateLabel = date.toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formattedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card day-view-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header day-view-header">
          <div className="day-view-title">
            <h2>{formattedDate}</h2>
            <span className="day-view-count">
              {events.length === 0
                ? "Ingen aftaler"
                : `${events.length} aftale${events.length !== 1 ? "r" : ""}`}
            </span>
          </div>
          <div className="day-view-header-actions">
            <button className="btn-add-day" onClick={() => onCreateEvent(dateKey)}>
              + Ny aftale
            </button>
            <button className="modal-close" onClick={onClose} aria-label="Luk">
              ✕
            </button>
          </div>
        </div>

        <div className="day-view-body">
          {events.length === 0 ? (
            <div className="day-view-empty">
              <p>Ingen aftaler denne dag.</p>
              <button className="btn-add-day-empty" onClick={() => onCreateEvent(dateKey)}>
                + Tilføj aftale
              </button>
            </div>
          ) : (
            <div className="day-view-list">
              {events.map((event) => {
                const chipColor = event.isBirthday ? "#A855F7" : event.color;
                return (
                  <button
                    key={`${event.id}-${event.startsAt}`}
                    className="day-view-item"
                    style={
                      {
                        "--chip-color": chipColor,
                        "--chip-rgb": hexToRgb(chipColor),
                      } as React.CSSProperties
                    }
                    onClick={() => onEditEvent(event)}
                  >
                    <span className="day-view-item-bar" />
                    <div className="day-view-item-content">
                      <span className="day-view-item-time">
                        {formatTimeRange(event.startsAt, event.endsAt, event.allDay)}
                      </span>
                      <span className="day-view-item-title">
                        {event.isBirthday && "🎂 "}
                        {event.title}
                      </span>
                      {(event.responsibleName || event.description) && (
                        <span className="day-view-item-meta">
                          {event.responsibleName && (
                            <span className="day-view-item-person">{event.responsibleName}</span>
                          )}
                          {event.description && (
                            <span className="day-view-item-desc">{event.description}</span>
                          )}
                        </span>
                      )}
                    </div>
                    {event.isRecurring && !event.isBirthday && (
                      <span className="day-view-item-recurring">↻</span>
                    )}
                    {event.needsConfirmation && (
                      <span className="day-view-item-pending">?</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
