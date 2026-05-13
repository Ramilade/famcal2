"use client";

import { useState } from "react";
import { generateInviteAction } from "./actions";

export function InviteSection({ familyId }: { familyId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    const token = await generateInviteAction(familyId);
    if (token) setLink(`${window.location.origin}/invite/${token}`);
    setLoading(false);
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="family-add-wrap">
      <h3 className="family-add-title">Invitér med link</h3>
      {link ? (
        <div className="invite-link-wrap">
          <input
            readOnly
            value={link}
            className="invite-link-input"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button onClick={copy} className="btn-ghost" type="button">
            {copied ? "✓ Kopieret" : "Kopiér"}
          </button>
          <p className="invite-link-note">Linket er gyldigt i 7 dage · engangs brug</p>
        </div>
      ) : (
        <button onClick={generate} disabled={loading} className="btn-ghost" type="button">
          {loading ? "Genererer…" : "Generér invitationslink"}
        </button>
      )}
    </div>
  );
}
