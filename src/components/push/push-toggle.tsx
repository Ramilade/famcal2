"use client";

import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
}

export function PushToggle({ showLabel }: { showLabel?: boolean } = {}) {
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);

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
          Push-notifikationer understøttes ikke i denne browser.
          På iPhone: tilføj FamCal til hjemmeskærmen via Del-knappen og åbn derfra.
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
      } else {
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
      }
    } catch (err) {
      console.error("Push toggle failed", err);
    } finally {
      setLoading(false);
    }
  }

  if (showLabel) {
    return (
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
    );
  }

  return (
    <button
      className={`push-toggle-btn${subscribed ? " push-toggle-btn--active" : ""}`}
      onClick={toggle}
      disabled={loading}
      title={subscribed ? "Slå notifikationer fra" : "Slå notifikationer til"}
    >
      {subscribed ? "🔔" : "🔕"}
    </button>
  );
}
