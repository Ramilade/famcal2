"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import type { CalendarEvent, Member } from "@/components/calendar/month-calendar";
import { EventModal } from "@/components/calendar/event-modal";

type SearchResult = CalendarEvent & { responsibleUserId: string | null };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

export function SearchModal({
  members,
  currentUserId,
  onClose,
}: {
  members: Member[];
  currentUserId: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  if (editEvent) {
    return (
      <EventModal
        mode="edit"
        event={editEvent}
        members={members}
        currentUserId={currentUserId}
        onClose={() => { setEditEvent(null); onClose(); }}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="search-card" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Søg i aftaler…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery("")}>✕</button>
          )}
        </div>

        {results.length > 0 && (
          <div className="search-results">
            {results.map((ev) => (
              <button
                key={ev.id}
                className="search-result-item"
                onClick={() => setEditEvent(ev)}
                style={{ "--chip-color": ev.isBirthday ? "#A855F7" : ev.color } as React.CSSProperties}
              >
                <span className="search-result-bar" />
                <div className="search-result-content">
                  <span className="search-result-title">
                    {ev.isBirthday && "🎂 "}{ev.title}
                  </span>
                  <span className="search-result-date">{formatDate(ev.startsAt)}</span>
                </div>
                {ev.isRecurring && <span className="search-result-recurring">↻</span>}
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && results.length === 0 && (
          <div className="search-empty">Ingen resultater for "{query}"</div>
        )}
      </div>
    </div>
  );
}
