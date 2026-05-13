"use client";

import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
}

type Prompt = "install" | "denied" | null;

function InstallPrompt({ onClose }: { onClose: () => void }) {
  return (
    <div className="push-prompt-overlay" onClick={onClose}>
      <div className="push-prompt-card" onClick={(e) => e.stopPropagation()}>
        <div className="push-prompt-icon-wrap">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4F7FEA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M12 8v8M8 12l4-4 4 4" />
          </svg>
        </div>
        <h3 className="push-prompt-title">Tilføj FamCal til hjemmeskærmen</h3>
        <p className="push-prompt-body">
          Push-notifikationer kræver at FamCal er installeret som app på din iPhone.
        </p>
        <ol className="push-prompt-steps">
          <li>
            Tryk på{" "}
            <strong>Del-knappen</strong>{" "}
            <svg style={{ display: "inline", verticalAlign: "middle" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>{" "}
            nederst i Safari
          </li>
          <li>Rul ned og tryk <strong>"Føj til hjemmeskærm"</strong></li>
          <li>Tryk <strong>"Tilføj"</strong> øverst til højre</li>
          <li>Åbn FamCal fra hjemmeskærmen og gå til Profil</li>
        </ol>
        <button className="push-prompt-close" onClick={onClose}>Forstået</button>
      </div>
    </div>
  );
}

function DeniedPrompt({ onClose }: { onClose: () => void }) {
  return (
    <div className="push-prompt-overlay" onClick={onClose}>
      <div className="push-prompt-card" onClick={(e) => e.stopPropagation()}>
        <div className="push-prompt-icon-wrap">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            <line x1="4" y1="4" x2="20" y2="20" />
          </svg>
        </div>
        <h3 className="push-prompt-title">Notifikationer er blokeret</h3>
        <p className="push-prompt-body">
          Du har tidligere afvist notifikationer fra FamCal. Gør følgende for at slå dem til:
        </p>
        <ol className="push-prompt-steps">
          <li>Åbn <strong>Indstillinger</strong> på din iPhone</li>
          <li>Rul ned og tryk på <strong>FamCal</strong></li>
          <li>Tryk på <strong>Notifikationer</strong></li>
          <li>Slå <strong>"Tillad notifikationer"</strong> til</li>
        </ol>
        <button className="push-prompt-close" onClick={onClose}>Forstået</button>
      </div>
    </div>
  );
}

export function PushToggle({ showLabel }: { showLabel?: boolean } = {}) {
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState<Prompt>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub)),
    );
  }, []);

  if (!supported) {
    if (showLabel) {
      return (
        <p style={{ color: "var(--text-2)", fontSize: "0.85rem", margin: 0 }}>
          Push-notifikationer understøttes ikke i denne browser. På iPhone skal du
          tilføje FamCal til hjemmeskærmen via Del-knappen i Safari og derefter åbne
          appen derfra.
        </p>
      );
    }
    return null;
  }

  async function toggle() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
        setSubscribed(false);
        return;
      }

      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

      if (!isStandalone) {
        setPrompt("install");
        return;
      }

      if (Notification.permission === "denied") {
        setPrompt("denied");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        }),
      });
      setSubscribed(true);
    } catch (err) {
      console.error("Push toggle failed", err);
    } finally {
      setLoading(false);
    }
  }

  const btn = showLabel ? (
    <button
      className={`push-toggle-btn${subscribed ? " push-toggle-btn--active" : ""}`}
      onClick={toggle}
      disabled={loading}
      style={{ width: "auto", padding: "0 18px", gap: 8, display: "flex", alignItems: "center", height: 42 }}
    >
      <span>{subscribed ? "🔔" : "🔕"}</span>
      <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
        {loading ? "Vent…" : subscribed ? "Notifikationer er slået til" : "Slå notifikationer til"}
      </span>
    </button>
  ) : (
    <button
      className={`push-toggle-btn${subscribed ? " push-toggle-btn--active" : ""}`}
      onClick={toggle}
      disabled={loading}
      title={subscribed ? "Slå notifikationer fra" : "Slå notifikationer til"}
    >
      {subscribed ? "🔔" : "🔕"}
    </button>
  );

  return (
    <>
      {btn}
      {prompt === "install" && <InstallPrompt onClose={() => setPrompt(null)} />}
      {prompt === "denied" && <DeniedPrompt onClose={() => setPrompt(null)} />}
    </>
  );
}
