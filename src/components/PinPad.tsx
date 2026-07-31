"use client";

import { useState } from "react";

export default function PinPad({
  onSubmit,
}: {
  onSubmit: (pin: string) => Promise<string | null>;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await onSubmit(pin);
    setBusy(false);
    if (err) {
      setError(err);
      setPin("");
    }
  }

  return (
    <form className="pin-form" onSubmit={handleSubmit}>
      <p className="subtitle">Masukkan PIN Orang Tua</p>
      <input
        className="pin-input"
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
      {error && <div className="error-banner">{error}</div>}
      <button className="pin-submit" type="submit" disabled={busy || !pin}>
        Masuk
      </button>
    </form>
  );
}
