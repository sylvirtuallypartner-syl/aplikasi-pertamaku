"use client";

import { useEffect, useMemo, useState } from "react";
import { ChildDef, fmtRp } from "@/lib/tasks";
import { monthLabel, monthRange, todayStr } from "@/lib/date";
import { EntryRow, rowsToValuesByDate, summarizeMonth } from "@/lib/recap";

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default function MonthlyRecap({ child }: { child: ChildDef }) {
  const [ym, setYm] = useState(currentYearMonth);
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { start, end } = monthRange(ym.year, ym.month);

  useEffect(() => {
    let cancelled = false;
    // Refetch whenever the selected month changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetch(`/api/entries?childId=${child.id}&start=${start}&end=${end}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal memuat rekap bulanan");
        if (!cancelled) setRows(data.rows ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal memuat rekap bulanan");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [child.id, start, end]);

  const summary = useMemo(() => {
    const valuesByDate = rowsToValuesByDate(rows);
    return summarizeMonth(child, ym.year, ym.month, start, end, valuesByDate, todayStr());
  }, [child, ym, start, end, rows]);

  function shiftMonth(delta: number) {
    setYm((prev) => {
      const d = new Date(prev.year, prev.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  }

  const exportHref = `/api/export?childId=${child.id}&start=${start}&end=${end}`;

  return (
    <div className="card">
      <h3>🗓️ Rekap Bulanan</h3>
      <div className="month-nav">
        <button onClick={() => shiftMonth(-1)} aria-label="Bulan sebelumnya">
          ◀
        </button>
        <span>{monthLabel(ym.year, ym.month)}</span>
        <button onClick={() => shiftMonth(1)} aria-label="Bulan berikutnya">
          ▶
        </button>
      </div>

      {error && <div className="status-line error">{error}</div>}

      {loading ? (
        <div className="empty-note">Memuat rekap...</div>
      ) : summary.days.length === 0 ? (
        <div className="empty-note">Belum ada data untuk bulan ini.</div>
      ) : (
        <>
          <div className="weekly-summary">
            <div className="pill">
              Total Poin: <b>{summary.total}</b> / {summary.max}
            </div>
            <div className="pill">
              Rata-rata: <b>{Math.round(summary.pct * 100)}%</b>
            </div>
            <div className="pill">
              Total Reward: <b>{fmtRp(summary.totalReward)}</b>
            </div>
            <div className="pill">
              Rata-rata Reward/hari: <b>{fmtRp(summary.avgReward)}</b>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table className="recap-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Poin</th>
                  <th>Capaian</th>
                  <th>Reward</th>
                </tr>
              </thead>
              <tbody>
                {summary.days.map((d) => (
                  <tr key={d.date}>
                    <td>
                      {d.date} {d.weekend ? "🌤" : ""}
                    </td>
                    <td className="num">
                      {d.total}/{d.max}
                    </td>
                    <td className="num">{Math.round(d.pct * 100)}%</td>
                    <td className="num">{fmtRp(d.reward)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ margin: "14px 0" }}>
        <a className="export-btn" href={exportHref} download>
          ⬇️ Export CSV bulan ini
        </a>
      </div>
    </div>
  );
}
