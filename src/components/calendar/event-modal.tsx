"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import {
  createEventAction, updateEventAction, deleteEventAction,
  confirmEventAction, declineEventAction,
  counterProposeEventAction, acceptCounterProposalAction, declineCounterProposalAction,
} from "@/app/events/actions";
import { ChecklistSection } from "./checklist-section";
import type { CalendarEvent, Member } from "./month-calendar";

const REMINDER_OPTIONS = [
  { value: "", label: "Ingen påmindelse" },
  { value: "15", label: "15 min før" },
  { value: "30", label: "30 min før" },
  { value: "60", label: "1 time før" },
  { value: "120", label: "2 timer før" },
  { value: "1440", label: "1 dag før" },
];

const PRESET_COLORS = [
  { value: "#3B82F6", label: "Blå" },
  { value: "#22C55E", label: "Grøn" },
  { value: "#A855F7", label: "Lilla" },
  { value: "#EF4444", label: "Rød" },
  { value: "#F97316", label: "Orange" },
  { value: "#EC4899", label: "Pink" },
  { value: "#14B8A6", label: "Turkis" },
  { value: "#EAB308", label: "Gul" },
];

const BIRTHDAY_COLOR = "#A855F7";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type RecurringScope = "this" | "future" | "all";

type Props =
  | { mode: "create"; dateKey: string; members: Member[]; currentUserId: string; onClose: () => void }
  | { mode: "edit"; event: CalendarEvent; members: Member[]; currentUserId: string; onClose: () => void };

export function EventModal(props: Props) {
  const { mode, onClose, members, currentUserId } = props;
  const isEdit = mode === "edit";
  const event = isEdit ? props.event : null;

  const defaultColor = isEdit
    ? event!.color
    : (members.find((m) => m.id === currentUserId)?.color ?? PRESET_COLORS[0].value);

  const defaultReminder = isEdit ? String(event!.reminderMinutes ?? "") : "";
  const [color, setColor] = useState(defaultColor);
  const [isBirthday, setIsBirthday] = useState(isEdit ? event!.isBirthday : false);
  const [allDay, setAllDay] = useState(isEdit ? event!.allDay : false);
  const [needsConfirmation, setNeedsConfirmation] = useState(isEdit ? event!.needsConfirmation : false);
  const [confirmWith, setConfirmWith] = useState(isEdit ? (event!.confirmWithUserId ?? "") : "");
  const [participants, setParticipants] = useState<string[]>(
    isEdit ? (event!.participants?.map((p) => p.userId) ?? []) : [],
  );
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterStart, setCounterStart] = useState(isEdit ? toDatetimeLocal(event!.startsAt) : "");
  const [counterEnd, setCounterEnd] = useState(isEdit ? toDatetimeLocal(event!.endsAt) : "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [recurringScope, setRecurringScope] = useState<RecurringScope>("all");
  const [showRecurrence, setShowRecurrence] = useState(
    isEdit ? (!!event!.recurrence && !event!.isBirthday) : false,
  );
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleBirthdayChange(checked: boolean) {
    setIsBirthday(checked);
    if (checked) {
      setColor(BIRTHDAY_COLOR);
      setShowRecurrence(false);
    }
  }

  const dateKey = !isEdit ? props.dateKey : "";
  const defaultStart = isEdit ? toDatetimeLocal(event!.startsAt) : `${dateKey}T09:00`;
  const defaultEnd = isEdit ? toDatetimeLocal(event!.endsAt) : `${dateKey}T10:00`;

  function handleSubmit(fd: FormData) {
    fd.set("color", color);
    if (allDay) {
      const start = fd.get("startsAt") as string;
      const end = fd.get("endsAt") as string;
      if (start) fd.set("startsAt", new Date(start.slice(0, 10) + "T00:00:00Z").toISOString());
      if (end) fd.set("endsAt", new Date(end.slice(0, 10) + "T23:59:00Z").toISOString());
    }
    startTransition(async () => {
      if (isEdit) {
        fd.set("id", event!.id);
        if (event!.isRecurring && !event!.isBirthday) {
          fd.set("editScope", recurringScope);
          fd.set("occurrenceDate", event!.occurrenceDate ?? event!.startsAt);
        }
        await updateEventAction(fd);
      } else {
        await createEventAction(fd);
      }
      onClose();
    });
  }

  function handleConfirm() {
    if (!isEdit) return;
    startTransition(async () => {
      await confirmEventAction(event!.id);
      onClose();
    });
  }

  function handleDecline() {
    if (!isEdit) return;
    startTransition(async () => {
      await declineEventAction(event!.id);
      onClose();
    });
  }

  function handleCounterPropose() {
    if (!isEdit || !counterStart || !counterEnd) return;
    startTransition(async () => {
      await counterProposeEventAction(
        event!.id,
        new Date(counterStart).toISOString(),
        new Date(counterEnd).toISOString(),
      );
      onClose();
    });
  }

  function handleAcceptCounter() {
    if (!isEdit) return;
    startTransition(async () => {
      await acceptCounterProposalAction(event!.id);
      onClose();
    });
  }

  function handleDeclineCounter() {
    if (!isEdit) return;
    startTransition(async () => {
      await declineCounterProposalAction(event!.id);
      onClose();
    });
  }

  function handleDelete() {
    if (!isEdit) return;
    const fd = new FormData();
    fd.set("id", event!.id);
    if (event!.isRecurring && !event!.isBirthday) {
      fd.set("deleteScope", recurringScope);
      fd.set("occurrenceDate", event!.occurrenceDate ?? event!.startsAt);
    }
    startTransition(async () => {
      await deleteEventAction(fd);
      onClose();
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? "Rediger aftale" : "Ny aftale"}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Luk">
            ✕
          </button>
        </div>

        <form action={handleSubmit}>
          <div className="modal-body">
            {isEdit && (
              <div className="modal-meta">
                <span className="modal-meta-label">Oprettet af</span>
                <span className="modal-meta-value">{event!.createdByName}</span>
                {event!.isRecurring && (
                  <>
                    <span className="modal-meta-sep">·</span>
                    <span className="modal-meta-recurring">
                      {event!.isBirthday ? "🎂 Fødselsdag" : "↻ Tilbagevendende"}
                    </span>
                  </>
                )}
              </div>
            )}

            {isEdit && event!.isRecurring && !event!.isBirthday && (
              <div className="recurrence-scope">
                <span className="field-label">Rediger</span>
                <div className="recurrence-scope-btns">
                  {(["this", "future", "all"] as RecurringScope[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`scope-btn${recurringScope === s ? " scope-btn--active" : ""}`}
                      onClick={() => setRecurringScope(s)}
                    >
                      {s === "this" ? "Kun denne" : s === "future" ? "Denne og fremtidige" : "Alle"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isEdit && event!.participants && event!.participants.length > 0 && (
              <div className="modal-meta modal-participants-meta">
                <span className="modal-meta-label">Deltagere</span>
                <div className="modal-participant-tags">
                  {event!.participants.map((p) => (
                    <span key={p.userId} className="modal-participant-tag">{p.name.split(" ")[0]}</span>
                  ))}
                </div>
              </div>
            )}

            {isEdit && event!.needsConfirmation && event!.confirmWithUserId === currentUserId && (
              <div className="needs-confirmation-banner">
                <p className="needs-confirmation-banner-text">
                  <strong>{event!.createdByName}</strong> vil afklare denne aftale med dig
                </p>
                {!showCounterForm ? (
                  <div className="confirm-actions">
                    <button type="button" className="btn-confirm" onClick={handleConfirm} disabled={pending}>
                      ✓ Bekræft
                    </button>
                    <button type="button" className="btn-decline" onClick={handleDecline} disabled={pending}>
                      ✕ Afslå
                    </button>
                    <button type="button" className="btn-counter" onClick={() => setShowCounterForm(true)} disabled={pending}>
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
                        type="button"
                        className="btn-save"
                        onClick={handleCounterPropose}
                        disabled={pending || !counterStart || !counterEnd}
                      >
                        {pending ? "Sender…" : "Send forslag"}
                      </button>
                      <button type="button" className="btn-cancel" onClick={() => setShowCounterForm(false)} disabled={pending}>
                        Annuller
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isEdit && event!.needsConfirmation && event!.createdByUserId === currentUserId && event!.counterProposalStart && (
              <div className="needs-confirmation-banner needs-confirmation-banner--counter">
                <p className="needs-confirmation-banner-text">
                  <strong>{event!.confirmWithName}</strong> foreslår nyt tidspunkt:
                </p>
                <p className="counter-proposal-time">
                  {new Date(event!.counterProposalStart).toLocaleString("da-DK", {
                    weekday: "short", day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })}
                  {event!.counterProposalEnd && ` – ${new Date(event!.counterProposalEnd).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`}
                </p>
                <div className="confirm-actions">
                  <button type="button" className="btn-confirm" onClick={handleAcceptCounter} disabled={pending}>
                    ✓ Accepter forslag
                  </button>
                  <button type="button" className="btn-decline" onClick={handleDeclineCounter} disabled={pending}>
                    ✕ Afvis forslag
                  </button>
                </div>
              </div>
            )}

            {isEdit && event!.needsConfirmation && event!.confirmWithUserId !== currentUserId && !event!.counterProposalStart && event!.confirmWithName && (
              <div className="needs-confirmation-status">
                ⏳ Afventer bekræftelse fra <strong>{event!.confirmWithName}</strong>
              </div>
            )}

            <div className="event-flags">
              <label className="event-flag-toggle">
                <input
                  type="checkbox"
                  name="allDay"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                />
                <span>Hele dagen</span>
              </label>
              <label className="birthday-toggle event-flag-toggle">
                <input
                  type="checkbox"
                  name="isBirthday"
                  checked={isBirthday}
                  onChange={(e) => handleBirthdayChange(e.target.checked)}
                />
                <span>🎂 Fødselsdag</span>
              </label>
              <label className="event-flag-toggle">
                <input
                  type="checkbox"
                  name="needsConfirmation"
                  checked={needsConfirmation}
                  onChange={(e) => setNeedsConfirmation(e.target.checked)}
                />
                <span>❓ Skal aftales</span>
              </label>
            </div>

            {needsConfirmation && members.filter(m => m.id !== currentUserId).length > 0 && (
              <label className="field">
                <span>Skal aftales med</span>
                <select
                  name="confirmWithUserId"
                  value={confirmWith}
                  onChange={(e) => setConfirmWith(e.target.value)}
                >
                  <option value="">Vælg person…</option>
                  {members.filter(m => m.id !== currentUserId).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="field">
              <span>Titel</span>
              <input
                ref={titleRef}
                name="title"
                required
                maxLength={120}
                placeholder={isBirthday ? "Hvems fødselsdag?" : "Hvad skal der ske?"}
                defaultValue={event?.title ?? ""}
              />
            </label>

            <label className="field">
              <span>Beskrivelse</span>
              <textarea
                name="description"
                maxLength={2000}
                rows={2}
                placeholder="Valgfri noter…"
                defaultValue={event?.description ?? ""}
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Start</span>
                <input
                  name="startsAt"
                  type={allDay ? "date" : "datetime-local"}
                  required
                  defaultValue={allDay ? defaultStart.slice(0, 10) : defaultStart}
                />
              </label>
              <label className="field">
                <span>Slut</span>
                <input
                  name="endsAt"
                  type={allDay ? "date" : "datetime-local"}
                  required
                  defaultValue={allDay ? defaultEnd.slice(0, 10) : defaultEnd}
                />
              </label>
            </div>

            {members.length > 0 && (
              <label className="field">
                <span>Ansvarlig</span>
                <select
                  name="responsibleUserId"
                  defaultValue={event?.responsibleUserId ?? ""}
                >
                  <option value="">Ingen</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {members.length > 1 && !isBirthday && (
              <div className="field">
                <span className="field-label">Deltagere</span>
                <div className="participant-picker">
                  {members.map((m) => {
                    const active = participants.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={`participant-btn${active ? " participant-btn--active" : ""}`}
                        style={active ? { borderColor: m.color, background: `${m.color}18` } : {}}
                        onClick={() =>
                          setParticipants((prev) =>
                            prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id],
                          )
                        }
                      >
                        <span
                          className="participant-avatar"
                          style={{ background: active ? m.color : undefined }}
                        >
                          {m.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                        </span>
                        {m.name.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
                {participants.map((uid) => (
                  <input key={uid} type="hidden" name="participantId" value={uid} />
                ))}
              </div>
            )}

            <div className="field">
              <span className="field-label">Farve</span>
              <div className="color-swatches">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`color-swatch${color === c.value ? " color-swatch--active" : ""}`}
                    style={{ background: c.value }}
                    title={c.label}
                    onClick={() => setColor(c.value)}
                  />
                ))}
              </div>
            </div>

            <label className="field">
              <span>Påmindelse</span>
              <select name="reminder" defaultValue={defaultReminder}>
                {REMINDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            {!isBirthday && (
              <div className="recurrence-section">
                <label className="recurrence-toggle">
                  <input
                    type="checkbox"
                    name="recurrenceEnabled"
                    checked={showRecurrence}
                    onChange={(e) => setShowRecurrence(e.target.checked)}
                  />
                  <span>Gentag begivenhed</span>
                </label>

                {showRecurrence && (
                  <div className="recurrence-fields">
                    <div className="field-row">
                      <label className="field">
                        <span>Frekvens</span>
                        <select
                          name="recurrenceFrequency"
                          defaultValue={event?.recurrence?.frequency ?? "weekly"}
                        >
                          <option value="daily">Dagligt</option>
                          <option value="weekly">Ugentligt</option>
                          <option value="monthly">Månedligt</option>
                          <option value="yearly">Årligt</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Interval</span>
                        <input
                          type="number"
                          name="recurrenceInterval"
                          min={1}
                          max={365}
                          defaultValue={event?.recurrence?.interval ?? 1}
                        />
                      </label>
                    </div>
                    <label className="field">
                      <span>Slutter den (valgfri)</span>
                      <input
                        type="date"
                        name="recurrenceUntil"
                        defaultValue={
                          event?.recurrence?.until
                            ? event.recurrence.until.slice(0, 10)
                            : ""
                        }
                      />
                    </label>
                    {isEdit && (
                      <p className="recurrence-note">
                        Ændringer gælder alle gentagelser.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {isBirthday && (
              <p className="recurrence-note">
                Fødselsdage gentages automatisk hvert år.
              </p>
            )}

            {isEdit && <ChecklistSection eventId={event!.id} />}
          </div>

          <div className="modal-footer">
            {isEdit &&
              (confirmDelete ? (
                <div className="delete-confirm">
                  <span>Er du sikker?</span>
                  <button
                    type="button"
                    className="btn-delete-confirm"
                    onClick={handleDelete}
                    disabled={pending}
                  >
                    Ja, slet
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Nej
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-delete"
                  onClick={() => setConfirmDelete(true)}
                  disabled={pending}
                >
                  Slet
                </button>
              ))}
            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                disabled={pending}
              >
                Annuller
              </button>
              <button type="submit" className="btn-save" disabled={pending}>
                {pending ? "Gemmer…" : isEdit ? "Gem ændringer" : "Opret aftale"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
