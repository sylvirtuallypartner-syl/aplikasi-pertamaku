"use client";

import { useState } from "react";
import { ChildDef, applicable, fmtRp } from "@/lib/tasks";
import { isWeekendDate } from "@/lib/date";
import {
  removeLocalRowsForDate,
  rowsToValuesByDate,
  summarizeDay,
  summarizeWeek,
  upsertLocalRow,
} from "@/lib/recap";
import { useWeekEntries } from "@/hooks/useWeekEntries";
import { useCelebrate } from "./Celebrate";

export default function ChildDashboard({ child }: { child: ChildDef }) {
  const { today, monday, rows, setRows, loading, error, refetch } = useWeekEntries(child.id);
  const { celebrate, celebrateLayer } = useCelebrate();
  const [resetting, setResetting] = useState(false);
  const [pendingTask, setPendingTask] = useState<string | null>(null);

  const valuesByDate = rowsToValuesByDate(rows);
  const todayValues = valuesByDate[today] ?? {};
  const weekend = isWeekendDate(today);
  const daySummary = summarizeDay(child, today, todayValues);
  const weekSummary = summarizeWeek(child, monday, valuesByDate, today);

  async function setValue(taskId: string, value: number, el: HTMLElement | null) {
    setPendingTask(taskId);
    const prevRows = rows;
    setRows(upsertLocalRow(rows, taskId, today, value));
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: child.id, taskId, date: today, value }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      if (value > 0) celebrate(el);
    } catch {
      setRows(prevRows);
    } finally {
      setPendingTask(null);
    }
  }

  function toggleBinary(taskId: string, current: number, el: HTMLElement | null) {
    void setValue(taskId, current ? 0 : 1, el);
  }

  function setTri(taskId: string, current: number, next: number, el: HTMLElement | null) {
    void setValue(taskId, current === next ? 0 : next, el);
  }

  async function resetToday() {
    setResetting(true);
    const prevRows = rows;
    setRows(removeLocalRowsForDate(rows, today));
    try {
      const res = await fetch("/api/entries/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: child.id, date: today }),
      });
      if (!res.ok) throw new Error("Gagal reset");
    } catch {
      setRows(prevRows);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="panel">
      {celebrateLayer}
      {error && (
        <div className="status-line error">
          {error} — akan dicoba lagi otomatis.{" "}
          <button className="link-btn" onClick={() => refetch()}>
            Coba lagi
          </button>
        </div>
      )}

      <div className="top-stats">
        <div className="stat-card">
          <div className="day-badge">
            {weekend ? "🌤 Weekend" : "📅 Weekday"} · {today}
          </div>
          <div className="stat-label">Poin Hari Ini</div>
          <div className="stat-value">
            {daySummary.total}{" "}
            <span style={{ fontSize: 15, color: "var(--grey)" }}>/ {daySummary.max}</span>
          </div>
        </div>
        <div className="stat-card ring-wrap">
          <div
            className="ring"
            style={{ "--pct": Math.round(daySummary.pct * 100) } as React.CSSProperties}
          >
            <div className="ring-inner">{Math.round(daySummary.pct * 100)}%</div>
          </div>
          <div>
            <div className="stat-label">Capaian</div>
            <div style={{ fontSize: 13, color: "var(--grey)" }}>Target harian</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Reward Hari Ini</div>
          <div className="reward-banner">💰 {fmtRp(daySummary.reward)}</div>
        </div>
      </div>

      <div className="card">
        <h3>
          ✅ Daftar Tugas
          <button className="reset-btn" disabled={resetting || loading} onClick={resetToday}>
            Reset hari ini
          </button>
        </h3>
        {child.mode === "tri" && (
          <div style={{ fontSize: 12, lineHeight: 1.7, color: "var(--grey)", marginBottom: 8 }}>
            ⭐ Mandiri (2) &nbsp; 🔔 Diingatkan (1) &nbsp; ❌ Belum (0)
          </div>
        )}
        {loading ? (
          <div className="empty-note">Memuat tugas...</div>
        ) : (
          child.tasks.map((t) => {
            const ok = applicable(t, weekend);
            if (child.mode === "binary") {
              const on = !!todayValues[t.id];
              return (
                <div className={`task-row ${ok ? "" : "disabled"}`} key={t.id}>
                  <div className="task-label">
                    {t.label}
                    {t.weekdayOnly && <span className="task-tag">weekday</span>}
                    {t.weekendOnly && <span className="task-tag">weekend</span>}
                  </div>
                  <button
                    className={`check-btn ${on ? "on" : ""}`}
                    disabled={!ok || pendingTask === t.id}
                    onClick={(e) => toggleBinary(t.id, todayValues[t.id] ?? 0, e.currentTarget)}
                  >
                    {on ? "✔" : ""}
                  </button>
                </div>
              );
            }
            const val = todayValues[t.id] ?? 0;
            return (
              <div className={`task-row ${ok ? "" : "disabled"}`} key={t.id}>
                <div className="task-label">
                  {t.label}
                  {t.weekdayOnly && <span className="task-tag">weekday</span>}
                  {t.weekendOnly && <span className="task-tag">weekend</span>}
                </div>
                <div className="seg">
                  <button
                    data-v="0"
                    className={val === 0 ? "on" : ""}
                    disabled={!ok || pendingTask === t.id}
                    onClick={(e) => setTri(t.id, val, 0, e.currentTarget)}
                  >
                    ❌
                  </button>
                  <button
                    data-v="1"
                    className={val === 1 ? "on" : ""}
                    disabled={!ok || pendingTask === t.id}
                    onClick={(e) => setTri(t.id, val, 1, e.currentTarget)}
                  >
                    🔔
                  </button>
                  <button
                    data-v="2"
                    className={val === 2 ? "on" : ""}
                    disabled={!ok || pendingTask === t.id}
                    onClick={(e) => setTri(t.id, val, 2, e.currentTarget)}
                  >
                    ⭐
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card">
        <h3>📊 Rekap Minggu Ini (Senin - Minggu)</h3>
        <div className="week-bars">
          {weekSummary.days.map((d, i) => (
            <div className={`week-bar-col ${d.isToday ? "today" : ""}`} key={i}>
              <div className="week-bar-track">
                <div className="week-bar-fill" style={{ height: `${Math.round(d.pct * 100)}%` }} />
              </div>
              <div className="week-bar-label">{d.label}</div>
            </div>
          ))}
        </div>
        <div className="weekly-summary">
          <div className="pill">
            Total Poin: <b>{weekSummary.total}</b> / {weekSummary.max}
          </div>
          <div className="pill">
            Rata-rata: <b>{Math.round(weekSummary.pct * 100)}%</b>
          </div>
        </div>
        <div className="reward-banner" style={{ marginTop: 10 }}>
          🏆 {weekSummary.bonus.label} — {weekSummary.bonus.text}
        </div>
        <div className="streak">🔥 {weekSummary.streak} hari berturut-turut capaian ≥70%</div>
      </div>
    </div>
  );
}
