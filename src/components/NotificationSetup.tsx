"use client";

import { useEffect, useState } from "react";

type Status = "unsupported" | "loading" | "off" | "on" | "denied";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function NotificationSetup() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    (async () => {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    })();
  }, []);

  async function enable() {
    setError(null);
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setError("Notifikasi belum dikonfigurasi di server.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal mengaktifkan notifikasi");
      setStatus("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengaktifkan notifikasi");
    }
  }

  async function disable() {
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menonaktifkan notifikasi");
    }
  }

  if (status === "unsupported") return null;

  return (
    <div className="notif-box">
      {status === "loading" && <span className="subtitle small">Memeriksa notifikasi…</span>}
      {status === "denied" && (
        <span className="subtitle small">
          Notifikasi diblokir di browser ini. Aktifkan lewat pengaturan situs kalau ingin reminder.
        </span>
      )}
      {status === "off" && (
        <button className="manager-btn primary" onClick={enable}>
          🔔 Aktifkan reminder harian (jam 20:00)
        </button>
      )}
      {status === "on" && (
        <button className="manager-btn" onClick={disable}>
          🔕 Matikan reminder harian
        </button>
      )}
      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
