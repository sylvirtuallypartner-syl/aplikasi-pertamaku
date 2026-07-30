"use client";

import { FormEvent, useState } from "react";

export default function PinModal({
  onSubmit,
  onCancel,
}: {
  onSubmit: (pin: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const err = await onSubmit(pin);
    setSubmitting(false);
    if (err) {
      setError(err);
      setPin("");
    }
  }

  return (
    <div className="pin-overlay">
      <div className="pin-box">
        <h3>🔒 Mode Ortu</h3>
        <form onSubmit={handleSubmit}>
          <input
            className="pin-input"
            type="password"
            inputMode="numeric"
            autoFocus
            maxLength={8}
            placeholder="Masukkan PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
          <div className="pin-error">{error ?? ""}</div>
          <button className="primary-btn" type="submit" disabled={submitting || !pin}>
            {submitting ? "Memeriksa..." : "Masuk"}
          </button>
          <button type="button" className="link-btn" onClick={onCancel}>
            Batal, kembali ke mode Anak
          </button>
        </form>
      </div>
    </div>
  );
}
