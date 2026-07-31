"use client";

import { useState } from "react";

const PIN_LENGTH = 6;

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
      <p className="subtitle">Masukkan PIN Orang Tua (6 digit)</p>
      <input
        className="pin-input"
        type="password"
        inputMode="numeric"
        pattern="\d*"
        maxLength={PIN_LENGTH}
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
      />
      {error && <div className="error-banner">{error}</div>}
      <button className="pin-submit" type="submit" disabled={busy || pin.length !== PIN_LENGTH}>
        Masuk
      </button>
    </form>
  );
}
