"use client";

import { useState } from "react";
import Stars from "@/components/Stars";
import ChildDashboard from "@/components/ChildDashboard";
import MonthlyRecap from "@/components/MonthlyRecap";
import PinModal from "@/components/PinModal";
import { useParentAuth } from "@/hooks/useParentAuth";
import { CHILD_ORDER, CHILDREN, ChildKey } from "@/lib/tasks";

type Mode = "anak" | "ortu";

export default function Home() {
  const [activeChild, setActiveChild] = useState<ChildKey>("k11");
  const [mode, setMode] = useState<Mode>("anak");
  const [showPin, setShowPin] = useState(false);
  const { authenticated, checking, login, logout } = useParentAuth();

  const child = CHILDREN[activeChild];

  function chooseMode(next: Mode) {
    if (next === "ortu" && !authenticated) {
      setShowPin(true);
      return;
    }
    setMode(next);
  }

  async function handlePinSubmit(pin: string) {
    const err = await login(pin);
    if (!err) {
      setShowPin(false);
      setMode("ortu");
    }
    return err;
  }

  function handleLogout() {
    logout();
    setMode("anak");
  }

  return (
    <div className="wrap">
      <Stars />
      <h1>🚀 Misi Harian Kemandirian</h1>
      <div className="subtitle">
        Klik tugas yang sudah selesai — poin, reward, dan progres minggu ini otomatis
        terhitung &amp; tersimpan untuk semua device.
      </div>

      <div className="mode-switch">
        <button
          className={`mode-btn ${mode === "anak" ? "active" : ""}`}
          onClick={() => chooseMode("anak")}
        >
          🧒 Mode Anak
        </button>
        <button
          className={`mode-btn ${mode === "ortu" ? "active" : ""}`}
          onClick={() => chooseMode("ortu")}
          disabled={checking}
        >
          🔒 Mode Ortu
        </button>
        {mode === "ortu" && authenticated && (
          <button className="mode-btn" onClick={handleLogout}>
            Keluar
          </button>
        )}
      </div>

      {showPin && (
        <PinModal onSubmit={handlePinSubmit} onCancel={() => setShowPin(false)} />
      )}

      <div className="tabs">
        {CHILD_ORDER.map((key) => {
          const c = CHILDREN[key];
          return (
            <button
              key={key}
              className={`tab-btn ${activeChild === key ? "active" : ""}`}
              onClick={() => setActiveChild(key)}
            >
              <span className="emoji">{c.emoji}</span> {c.name.toUpperCase()} ({c.age} Tahun)
            </button>
          );
        })}
      </div>

      <ChildDashboard key={child.id} child={child} />

      {mode === "ortu" && authenticated && <MonthlyRecap key={`recap-${child.id}`} child={child} />}

      <div className="footer-note">
        Data tersimpan di database (Postgres/Neon), sinkron otomatis di semua device —
        buka link ini kapan saja, progres tidak hilang.
      </div>
    </div>
  );
}
