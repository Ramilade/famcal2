"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import {
  addChecklistItemAction,
  toggleChecklistItemAction,
  deleteChecklistItemAction,
} from "@/app/events/checklist-actions";

type Item = { id: string; text: string; checked: boolean };

export function ChecklistSection({ eventId }: { eventId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [newText, setNewText] = useState("");
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/checklist`)
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {});
  }, [eventId]);

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    setNewText("");
    const tempId = `temp-${Date.now()}`;
    setItems((prev) => [...prev, { id: tempId, text, checked: false }]);
    startTransition(async () => {
      const item = await addChecklistItemAction(eventId, text);
      setItems((prev) => prev.map((i) => (i.id === tempId ? item : i)));
    });
  }

  function handleToggle(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
    startTransition(() => toggleChecklistItemAction(id));
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(() => deleteChecklistItemAction(id));
  }

  const done = items.filter((i) => i.checked).length;

  return (
    <div className="checklist-section">
      <div className="checklist-header">
        <span className="field-label">Tjekliste</span>
        {items.length > 0 && (
          <span className="checklist-progress">
            {done}/{items.length}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="checklist-items">
          {items.map((item) => (
            <div key={item.id} className={`checklist-item${item.checked ? " checklist-item--done" : ""}`}>
              <button
                type="button"
                className="checklist-check"
                onClick={() => handleToggle(item.id)}
                aria-label={item.checked ? "Markér som ikke færdig" : "Markér som færdig"}
              >
                {item.checked ? "✓" : ""}
              </button>
              <span className="checklist-item-text">{item.text}</span>
              <button
                type="button"
                className="checklist-item-del"
                onClick={() => handleDelete(item.id)}
                aria-label="Slet"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="checklist-add">
        <input
          ref={inputRef}
          type="text"
          className="checklist-input"
          placeholder="Tilføj opgave…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button
          type="button"
          className="checklist-add-btn"
          onClick={handleAdd}
          disabled={!newText.trim()}
        >
          +
        </button>
      </div>
    </div>
  );
}
