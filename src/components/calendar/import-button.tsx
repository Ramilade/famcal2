"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/ical/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { setMsg(json.error ?? "Fejl ved import"); return; }
      setMsg(`✓ ${json.imported} af ${json.total} begivenheder importeret`);
      router.refresh();
    } catch {
      setMsg("Fejl ved import");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="import-wrap">
      <input
        ref={inputRef}
        type="file"
        accept=".ics,text/calendar"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <button
        className="btn-ghost"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        title="Importér .ics kalender"
      >
        {loading ? "Importerer…" : "📥 Importer"}
      </button>
      {msg && <span className="import-msg">{msg}</span>}
    </div>
  );
}
