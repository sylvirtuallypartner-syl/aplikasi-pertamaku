"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHILD_ORDER,
  CHILDREN,
  ChildId,
  isChildId,
  tasksForToday,
} from "@/lib/tasks";
import { fullDateLabel, isWeekendDate, todayStr } from "@/lib/date";

const WHO_KEY = "kids-tracker-who";
const POLL_MS = 4000;

export default function Home() {
  const [who, setWho] = useState<ChildId | null>(null);
  const [whoLoaded, setWhoLoaded] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Set<string>>(new Set());

  useEffect(() => {
    // localStorage isn't available during SSR, so identity must be read
    // client-side after mount rather than in a lazy useState initializer.
    const saved = localStorage.getItem(WHO_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isChildId(saved)) setWho(saved);
    setWhoLoaded(true);
  }, []);

  function chooseWho(id: ChildId) {
    localStorage.setItem(WHO_KEY, id);
    setWho(id);
  }

  function changeWho() {
    localStorage.removeItem(WHO_KEY);
    setWho(null);
  }

  const refresh = useCallback(async (silent: boolean) => {
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
    refresh(false);
    const id = setInterval(() => refresh(true), POLL_MS);
    const onFocus = () => refresh(true);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  async function toggle(childId: ChildId, taskId: string) {
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

  if (!whoLoaded) return null;

  if (!who) {
    return (
      <div className="wrap">
        <h1>Kids Tracker</h1>
        <p className="subtitle">Kamu siapa?</p>
        <div className="who-list">
          {CHILD_ORDER.map((id) => {
            const c = CHILDREN[id];
            return (
              <button
                key={id}
                className="who-btn"
                style={{ background: c.color }}
                onClick={() => chooseWho(id)}
              >
                <span className="who-emoji">{c.emoji}</span>
                {c.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const weekend = isWeekendDate(date);
  const me = CHILDREN[who];

  return (
    <div className="wrap">
      <h1>Kids Tracker</h1>
      <div className="date-label">{fullDateLabel(date)}</div>
      <div className="who-bar">
        <span>
          Kamu: <b>{me.emoji} {me.name}</b>
        </span>
        <button className="change-btn" onClick={changeWho}>
          Ganti
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!loaded && <div className="loading">Memuat...</div>}

      {CHILD_ORDER.map((id) => {
        const child = CHILDREN[id];
        const tasks = tasksForToday(child, weekend);
        const isMe = id === who;
        return (
          <section key={id} className="child-card" style={{ borderColor: child.color }}>
            <h2 style={{ color: child.color }}>
              {child.emoji} {child.name}
            </h2>
            <ul className="task-list">
              {tasks.map((task) => {
                const key = `${id}:${task.id}`;
                const isDone = !!done[key];
                return (
                  <li key={task.id}>
                    <button
                      className={`task-row ${isDone ? "done" : ""} ${isMe ? "" : "locked"}`}
                      onClick={() => isMe && toggle(id, task.id)}
                      disabled={!isMe}
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
        );
      })}
    </div>
  );
}
