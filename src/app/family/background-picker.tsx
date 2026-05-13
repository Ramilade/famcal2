"use client";

import { useState, useTransition } from "react";
import { updateFamilyBackgroundAction } from "./actions";

const PRESETS = [
  { label: "Ingen", value: "" },
  { label: "Havblå", value: "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)" },
  { label: "Lilla drøm", value: "linear-gradient(135deg,#e0c3fc 0%,#8ec5fc 100%)" },
  { label: "Morgenrøde", value: "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)" },
  { label: "Frisk grøn", value: "linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)" },
  { label: "Solnedgang", value: "linear-gradient(135deg,#fa709a 0%,#fee140 100%)" },
  { label: "Vinterhimmel", value: "linear-gradient(135deg,#a1c4fd 0%,#c2e9fb 100%)" },
  { label: "Gylden time", value: "linear-gradient(135deg,#f6d365 0%,#fda085 100%)" },
  { label: "Dybhav", value: "linear-gradient(135deg,#2c3e50 0%,#3498db 100%)" },
];

function isPreset(value: string) {
  return PRESETS.some((p) => p.value === value);
}

export function BackgroundPicker({
  currentBackground,
  familyId,
}: {
  currentBackground: string | null;
  familyId: string;
}) {
  const current = currentBackground ?? "";
  const [selected, setSelected] = useState(current);
  const [customUrl, setCustomUrl] = useState(isPreset(current) ? "" : current);
  const [, startTransition] = useTransition();

  function apply(value: string) {
    setSelected(value);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("familyId", familyId);
      fd.set("backgroundUrl", value);
      await updateFamilyBackgroundAction(fd);
    });
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply(customUrl.trim());
  }

  return (
    <div className="bg-picker">
      <div className="bg-presets">
        {PRESETS.map((p) => (
          <button
            key={p.value || "none"}
            type="button"
            title={p.label}
            className={`bg-swatch${selected === p.value ? " bg-swatch--active" : ""}`}
            style={p.value ? { background: p.value } : undefined}
            onClick={() => { setCustomUrl(""); apply(p.value); }}
          >
            {!p.value && <span className="bg-swatch-none">✕</span>}
          </button>
        ))}
      </div>
      <form className="bg-custom-form" onSubmit={handleCustomSubmit}>
        <input
          type="url"
          className="bg-custom-input"
          placeholder="Billed-URL (https://…)"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
        />
        <button
          type="submit"
          className="btn-save"
          style={{ padding: "8px 16px", fontSize: "0.82rem" }}
          disabled={!customUrl.trim()}
        >
          Sæt
        </button>
      </form>
    </div>
  );
}
