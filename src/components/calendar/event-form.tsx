"use client";

import { useState } from "react";
import { createEventAction } from "@/app/events/actions";

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

export function EventForm() {
  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].value);

  return (
    <div className="event-form-wrap">
      {!open && (
        <button className="add-event-btn" onClick={() => setOpen(true)}>
          <span className="add-event-btn-icon">+</span>
          Tilføj aftale
        </button>
      )}

      {open && (
        <form
          className="event-form-card"
          action={async (fd) => {
            fd.set("color", selectedColor);
            await createEventAction(fd);
            setOpen(false);
          }}
        >
          <div className="event-form-header">
            <h2>Ny aftale</h2>
            <button type="button" className="event-form-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="event-form-body">
            <label className="field">
              <span>Titel</span>
              <input name="title" required maxLength={120} placeholder="Hvad skal der ske?" autoFocus />
            </label>

            <label className="field">
              <span>Beskrivelse</span>
              <textarea name="description" maxLength={2000} rows={2} placeholder="Valgfri noter…" />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Start</span>
                <input name="startsAt" type="datetime-local" required />
              </label>
              <label className="field">
                <span>Slut</span>
                <input name="endsAt" type="datetime-local" required />
              </label>
            </div>

            <div className="field">
              <span className="field-label">Farve</span>
              <div className="color-swatches">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`color-swatch${selectedColor === c.value ? " color-swatch--active" : ""}`}
                    style={{ background: c.value }}
                    title={c.label}
                    onClick={() => setSelectedColor(c.value)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="event-form-footer">
            <button type="button" className="btn-cancel" onClick={() => setOpen(false)}>Annuller</button>
            <button type="submit" className="btn-save">Gem aftale</button>
          </div>
        </form>
      )}
    </div>
  );
}
