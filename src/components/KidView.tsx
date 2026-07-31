"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHILDREN, ChildId } from "@/lib/children";
import { TaskDef, tasksForToday } from "@/lib/tasks";
import { fullDateLabel, isWeekendDate, todayStr } from "@/lib/date";

const STATUS_POLL_MS = 4000;

export default function KidView({ childId }: { childId: ChildId }) {
  const child = CHILDREN[childId];
  const [date, setDate] = useState(todayStr());
  const [tasks, setTasks] = useState<TaskDef[]>([]);
  const [done, setDone] = useState<Record<string, boolean>>({});
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

  const loadStatus = useCallback(async (silent: boolean) => {
    const today = todayStr();
    setDate(today);
    try {
      const res = await fetch(`/api/status?date=${today}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data");
      setDone((prev) => {
        const next = { ...data.done };
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
  }, []);

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

  async function toggle(taskId: number) {
    const key = `${childId}:${taskId}`;
    const nextValue = !done[key];
    pending.current.add(key);
    setDone((prev) => ({ ...prev, [key]: nextValue }));
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, taskId, date, done: nextValue }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      setError(null);
    } catch {
      setDone((prev) => ({ ...prev, [key]: !nextValue }));
      setError("Gagal menyimpan, coba tap lagi.");
    } finally {
      pending.current.delete(key);
    }
  }

  const weekend = isWeekendDate(date);
  const myTasks = tasksForToday(tasks, childId, weekend);

  return (
    <div>
      <div className="date-label">{fullDateLabel(date)}</div>
      {error && <div className="error-banner">{error}</div>}
      {!loaded && <div className="loading">Memuat...</div>}

      <section className="child-card" style={{ borderColor: child.color }}>
        <h2 style={{ color: child.color }}>
          {child.emoji} {child.name}
        </h2>
        <ul className="task-list">
          {myTasks.map((task) => {
            const key = `${childId}:${task.id}`;
            const isDone = !!done[key];
            return (
              <li key={task.id}>
                <button
                  className={`task-row ${isDone ? "done" : ""}`}
                  onClick={() => toggle(task.id)}
                  aria-pressed={isDone}
                >
                  <span className="check">{isDone ? "✓" : ""}</span>
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
