"use client";

import { useState, useTransition } from "react";
import {
  confirmEventAction,
  declineEventAction,
  counterProposeEventAction,
  acceptCounterProposalAction,
  declineCounterProposalAction,
} from "@/app/events/actions";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("da-DK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  color: string;
  type: "needs-confirmation" | "counter-proposal";
  createdByName?: string | null;
  confirmWithName?: string | null;
  counterProposalStart?: string | null;
  counterProposalEnd?: string | null;
};

export function PendingCard(props: Props) {
  const {
    eventId, title, startsAt, endsAt, allDay, color,
    type, createdByName, confirmWithName,
    counterProposalStart, counterProposalEnd,
  } = props;

  const [pending, startTransition] = useTransition();
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterStart, setCounterStart] = useState(toDatetimeLocal(startsAt));
  const [counterEnd, setCounterEnd] = useState(toDatetimeLocal(endsAt));

  const timeLabel = allDay
    ? "Hele dagen"
    : new Date(startsAt).toLocaleString("da-DK", {
        weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      });

  function act(fn: () => Promise<void>) {
    startTransition(async () => { await fn(); });
  }

  if (type === "counter-proposal") {
    return (
      <div className="pending-card pending-card--counter" style={{ "--chip-color": color } as React.CSSProperties}>
        <span className="pending-card-bar" />
        <div className="pending-card-body">
          <span className="pending-badge pending-badge--counter">Modforslag modtaget</span>
          <p className="pending-card-title">{title}</p>
          <p className="pending-card-time">
            <strong>{confirmWithName}</strong> foreslår:{" "}
            {counterProposalStart ? formatDateTime(counterProposalStart) : ""}
            {counterProposalEnd
              ? ` – ${new Date(counterProposalEnd).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </p>
          <p className="pending-card-original">Originalt: {timeLabel}</p>
          <div className="confirm-actions">
            <button
              className="btn-confirm"
              disabled={pending}
              onClick={() => act(() => acceptCounterProposalAction(eventId))}
            >
              ✓ Accepter forslag
            </button>
            <button
              className="btn-decline"
              disabled={pending}
              onClick={() => act(() => declineCounterProposalAction(eventId))}
            >
              ✕ Afvis forslag
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pending-card" style={{ "--chip-color": color } as React.CSSProperties}>
      <span className="pending-card-bar" />
      <div className="pending-card-body">
        <span className="pending-badge">Afventer din bekræftelse</span>
        <p className="pending-card-title">{title}</p>
        <p className="pending-card-time">
          {timeLabel} · <span className="pending-card-creator">Foreslået af {createdByName}</span>
        </p>

        {!showCounterForm ? (
          <div className="confirm-actions">
            <button
              className="btn-confirm"
              disabled={pending}
              onClick={() => act(() => confirmEventAction(eventId))}
            >
              ✓ Bekræft
            </button>
            <button
              className="btn-decline"
              disabled={pending}
              onClick={() => act(() => declineEventAction(eventId))}
            >
              ✕ Afslå
            </button>
            <button
              className="btn-counter"
              disabled={pending}
              onClick={() => setShowCounterForm(true)}
            >
              📅 Foreslå nyt tidspunkt
            </button>
          </div>
        ) : (
          <div className="counter-form">
            <div className="field-row">
              <label className="field">
                <span>Ny start</span>
                <input
                  type="datetime-local"
                  value={counterStart}
                  onChange={(e) => setCounterStart(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Ny slut</span>
                <input
                  type="datetime-local"
                  value={counterEnd}
                  onChange={(e) => setCounterEnd(e.target.value)}
                />
              </label>
            </div>
            <div className="confirm-actions">
              <button
                className="btn-save"
                disabled={pending || !counterStart || !counterEnd}
                onClick={() =>
                  act(() =>
                    counterProposeEventAction(
                      eventId,
                      new Date(counterStart).toISOString(),
                      new Date(counterEnd).toISOString(),
                    )
                  )
                }
              >
                {pending ? "Sender…" : "Send forslag"}
              </button>
              <button
                className="btn-cancel"
                disabled={pending}
                onClick={() => setShowCounterForm(false)}
              >
                Annuller
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
