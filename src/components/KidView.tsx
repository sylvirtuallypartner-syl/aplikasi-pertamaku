"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHILDREN, ChildId } from "@/lib/children";
import { TaskDef, tasksForToday } from "@/lib/tasks";
import { fullDateLabel, isWeekendDate, lastNDays, shortDateLabel, todayStr } from "@/lib/date";
import { EMPTY_ENTRY, StatusEntry, statusIcon, statusRowClass } from "@/lib/status";

const STATUS_POLL_MS = 4000;
const HISTORY_DAYS = 14;

export default function KidView({ childId }: { childId: ChildId }) {
  const [followToday, setFollowToday] = useState(true);
  const [viewDate, setViewDate] = useState(todayStr());
  const [tasks, setTasks] = useState<TaskDef[]>([]);
  const [entries, setEntries] = useState<Record<string, StatusEntry>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Set<string>>(new Set());

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat tugas");
      const mapped: TaskDef[] = data.tasks.map(
        (t: { id: number; child_id: ChildId; label: string; weekday_only: boolean; weekend_only: boolean }) => ({
          id: t.id,
          childId: t.child_id,
          label: t.label,
          weekdayOnly: t.weekday_only,
          weekendOnly: t.weekend_only,
        })
      );
      setTasks(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat tugas");
    }
  }, []);

  const loadStatus = useCallback(
    async (silent: boolean) => {
      const target = followToday ? todayStr() : viewDate;
      setViewDate(target);
      try {
        const res = await fetch(`/api/status?date=${target}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat data");
        setEntries((prev) => {
          const next = { ...data.entries };
          for (const key of pending.current) {
            if (key in prev) next[key] = prev[key];
          }
          return next;
        });
        setError(null);
      } catch (err) {
        if (!silent) setError(err instanceof Error ? err.message : "Gagal memuat data");
      } finally {
        setLoaded(true);
      }
    },
    [followToday, viewDate]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTasks();
    loadStatus(false);
    const id = setInterval(() => loadStatus(true), STATUS_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadTasks();
        loadStatus(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadTasks, loadStatus]);

  function pickDate(value: string) {
    if (value === "today") {
      setFollowToday(true);
      setViewDate(todayStr());
    } else {
      setFollowToday(false);
      setViewDate(value);
    }
  }

  async function toggle(taskId: number) {
    const key = `${childId}:${taskId}`;
    const current = entries[key] ?? EMPTY_ENTRY;
    const nextValue = !current.done;
    pending.current.add(key);
    setEntries((prev) => ({ ...prev, [key]: { done: nextValue, approved: nextValue ? current.approved : false } }));
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, taskId, date: viewDate, done: nextValue }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      setError(null);
    } catch {
      setEntries((prev) => ({ ...prev, [key]: current }));
      setError("Gagal menyimpan, coba tap lagi.");
    } finally {
      pending.current.delete(key);
    }
  }

  const weekend = isWeekendDate(viewDate);
  const child = CHILDREN[childId];
  const myTasks = tasksForToday(tasks, childId, weekend);
  const historyDates = lastNDays(HISTORY_DAYS).slice(1);

  return (
    <div>
      <div className="date-picker-row">
        <select
          className="date-select"
          value={followToday ? "today" : viewDate}
          onChange={(e) => pickDate(e.target.value)}
        >
          <option value="today">Hari ini</option>
          {historyDates.map((d) => (
            <option key={d} value={d}>
              {shortDateLabel(d)}
            </option>
          ))}
        </select>
      </div>
      <div className="date-label">{fullDateLabel(viewDate)}</div>
      {!followToday && (
        <div className="history-banner">
          Lihat tanggal lain.{" "}
          <button className="change-btn" onClick={() => pickDate("today")}>
            Kembali ke hari ini
          </button>
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}
      {!loaded && <div className="loading">Memuat...</div>}

      <section className="child-card" style={{ borderColor: child.color }}>
        <h2 style={{ color: child.color }}>
          {child.emoji} {child.name}
        </h2>
        <ul className="task-list">
          {myTasks.map((task) => {
            const entry = entries[`${childId}:${task.id}`] ?? EMPTY_ENTRY;
            return (
              <li key={task.id}>
                <button
                  className={`task-row ${statusRowClass(entry)}`}
                  onClick={() => toggle(task.id)}
                  aria-pressed={entry.done}
                >
                  <span className="check">{statusIcon(entry)}</span>
                  <span className="label">{task.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
