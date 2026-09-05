"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHILD_ORDER, CHILDREN, ChildId } from "@/lib/children";
import { TaskDef, tasksForToday } from "@/lib/tasks";
import {
  addDays,
  fullDateLabel,
  isWeekendDate,
  lastNDays,
  mondayOf,
  shortDateLabel,
  todayStr,
  weekDates,
} from "@/lib/date";
import PinPad from "./PinPad";

const STATUS_POLL_MS = 4000;
const MAX_TASK_LABEL = 50;
const MAX_TIER_LABEL = 60;
const HISTORY_DAYS = 14;

interface StatusEntry {
  done: boolean;
  approved: boolean;
}

const EMPTY_ENTRY: StatusEntry = { done: false, approved: false };

interface RawTask {
  id: number;
  child_id: ChildId;
  label: string;
  weekday_only: boolean;
  weekend_only: boolean;
  sort_order: number;
}

interface RewardRate {
  child_id: ChildId;
  amount_per_task: number;
}

interface WeeklyTier {
  id: number;
  child_id: ChildId;
  min_percent: number;
  label: string;
}

type ByDate = Record<string, Record<string, StatusEntry>>;

function toTaskDef(t: RawTask): TaskDef {
  return {
    id: t.id,
    childId: t.child_id,
    label: t.label,
    weekdayOnly: t.weekday_only,
    weekendOnly: t.weekend_only,
  };
}

function fmtRp(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}

export default function ParentView() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [followToday, setFollowToday] = useState(true);
  const [viewDate, setViewDate] = useState(todayStr());
  const [tasks, setTasks] = useState<RawTask[]>([]);
  const [rates, setRates] = useState<RewardRate[]>([]);
  const [entries, setEntries] = useState<Record<string, StatusEntry>>({});
  const [error, setError] = useState<string | null>(null);

  const [weekMonday, setWeekMonday] = useState(mondayOf(todayStr()));
  const [weekByDate, setWeekByDate] = useState<ByDate>({});
  const [weekError, setWeekError] = useState<string | null>(null);
  const [weeklyTiers, setWeeklyTiers] = useState<WeeklyTier[]>([]);
  const pendingToggle = useRef<Set<string>>(new Set());

  const loadAll = useCallback(async (dateOverride?: string) => {
    const target = dateOverride ?? (followToday ? todayStr() : viewDate);
    setViewDate(target);
    try {
      const [tasksRes, ratesRes, statusRes] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/reward-rates", { cache: "no-store" }),
        fetch(`/api/status?date=${target}`, { cache: "no-store" }),
      ]);
      const tasksData = await tasksRes.json();
      const ratesData = await ratesRes.json();
      const statusData = await statusRes.json();
      if (!tasksRes.ok) throw new Error(tasksData.error);
      if (!ratesRes.ok) throw new Error(ratesData.error);
      if (!statusRes.ok) throw new Error(statusData.error);
      setTasks(tasksData.tasks);
      setRates(ratesData.rates);
      // Baris yang lagi ditap (masih menunggu respons server) dipertahankan
      // nilai optimistiknya, supaya tidak ketiban snapshot lama dari
      // toggleTask() lain yang berjalan bersamaan.
      setEntries((prevEntries) => {
        const next = { ...statusData.entries };
        for (const key of pendingToggle.current) {
          if (key in prevEntries) next[key] = prevEntries[key];
        }
        return next;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    }
  }, [followToday, viewDate]);

  const loadWeek = useCallback(async () => {
    const start = weekMonday;
    const end = addDays(weekMonday, 6);
    try {
      const res = await fetch(`/api/status/range?start=${start}&end=${end}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWeekByDate(data.byDate);
      setWeekError(null);
    } catch (err) {
      setWeekError(err instanceof Error ? err.message : "Gagal memuat rekap mingguan");
    }
  }, [weekMonday]);

  const loadWeeklyTiers = useCallback(async () => {
    try {
      const res = await fetch("/api/weekly-tiers", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWeeklyTiers(data.tiers);
    } catch (err) {
      setWeekError(err instanceof Error ? err.message : "Gagal memuat reward mingguan");
    }
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/parent-auth", { cache: "no-store" });
      const data = await res.json();
      setAuthenticated(!!data.authenticated);
      setAuthChecked(true);
      if (data.authenticated) {
        loadAll();
        loadWeek();
        loadWeeklyTiers();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const id = setInterval(loadAll, STATUS_POLL_MS);
    return () => clearInterval(id);
  }, [authenticated, loadAll]);

  useEffect(() => {
    if (!authenticated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWeek();
  }, [authenticated, loadWeek]);

  function pickDate(value: string) {
    if (value === "today") {
      const today = todayStr();
      setFollowToday(true);
      setViewDate(today);
      loadAll(today);
    } else {
      setFollowToday(false);
      setViewDate(value);
      loadAll(value);
    }
  }

  async function handlePinSubmit(pin: string): Promise<string | null> {
    const res = await fetch("/api/parent-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || "PIN salah";
    setAuthenticated(true);
    loadAll();
    loadWeek();
    loadWeeklyTiers();
    return null;
  }

  async function handleLogout() {
    await fetch("/api/parent-auth", { method: "DELETE" });
    setAuthenticated(false);
  }

  async function addTask(childId: ChildId, label: string, weekdayOnly: boolean, weekendOnly: boolean) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, label, weekdayOnly, weekendOnly }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menambah tugas");
      return;
    }
    await loadAll();
  }

  async function saveTask(id: number, label: string, weekdayOnly: boolean, weekendOnly: boolean) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, weekdayOnly, weekendOnly }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal mengubah tugas");
      return;
    }
    await loadAll();
  }

  async function removeTask(id: number) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menghapus tugas");
      return;
    }
    await loadAll();
  }

  async function moveTask(childId: ChildId, index: number, direction: -1 | 1) {
    const childTasks = tasks.filter((t) => t.child_id === childId).sort((a, b) => a.sort_order - b.sort_order);
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= childTasks.length) return;
    const a = childTasks[index];
    const b = childTasks[otherIndex];
    await Promise.all([
      fetch(`/api/tasks/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: b.sort_order }),
      }),
      fetch(`/api/tasks/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: a.sort_order }),
      }),
    ]);
    await loadAll();
  }

  // Orang tua tap tugas -> langsung dianggap selesai (done + approved
  // sekaligus, satu langkah). Tap lagi untuk membatalkan.
  async function toggleTask(childId: ChildId, taskId: number) {
    const key = `${childId}:${taskId}`;
    const prev = entries[key] ?? EMPTY_ENTRY;
    const nextValue = !prev.approved;
    pendingToggle.current.add(key);
    setEntries((p) => ({ ...p, [key]: { done: nextValue, approved: nextValue } }));
    try {
      const statusRes = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, taskId, date: viewDate, done: nextValue }),
      });
      const statusData = await statusRes.json();
      if (!statusRes.ok) throw new Error(statusData.error || "Gagal menyimpan");

      if (nextValue) {
        const approveRes = await fetch("/api/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, taskId, date: viewDate, approved: true }),
        });
        const approveData = await approveRes.json();
        if (!approveRes.ok) throw new Error(approveData.error || "Gagal menyimpan");
      }
      setError(null);
    } catch (err) {
      setEntries((p) => ({ ...p, [key]: prev }));
      setError(err instanceof Error ? err.message : "Gagal menyimpan, coba tap lagi.");
    } finally {
      pendingToggle.current.delete(key);
    }
    await loadAll();
    await loadWeek();
  }

  async function saveRate(childId: ChildId, amountPerTask: number) {
    const res = await fetch("/api/reward-rates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, amountPerTask }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan reward");
      return;
    }
    await loadAll();
  }

  async function addWeeklyTier(childId: ChildId, minPercent: number, label: string) {
    const res = await fetch("/api/weekly-tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, minPercent, label }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menambah reward mingguan");
      return;
    }
    await loadWeeklyTiers();
  }

  async function saveWeeklyTier(id: number, minPercent: number, label: string) {
    const res = await fetch(`/api/weekly-tiers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minPercent, label }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal mengubah reward mingguan");
      return;
    }
    await loadWeeklyTiers();
  }

  async function removeWeeklyTier(id: number) {
    const res = await fetch(`/api/weekly-tiers/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menghapus reward mingguan");
      return;
    }
    await loadWeeklyTiers();
  }

  if (!authChecked) return null;

  if (!authenticated) {
    return <PinPad onSubmit={handlePinSubmit} />;
  }

  const weekend = isWeekendDate(viewDate);
  const allTaskDefs = tasks.map(toTaskDef);
  const historyDates = lastNDays(HISTORY_DAYS).slice(1);
  const days = weekDates(weekMonday);
  const isCurrentWeek = weekMonday === mondayOf(todayStr());

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
      <div className="who-bar">
        <button className="change-btn" onClick={handleLogout}>
          Keluar
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {CHILD_ORDER.map((childId) => {
        const child = CHILDREN[childId];
        const today = tasksForToday(allTaskDefs, childId, weekend);
        const completedCount = today.filter((t) => entries[`${childId}:${t.id}`]?.approved).length;
        const percent = today.length ? Math.round((completedCount / today.length) * 100) : 0;
        const rate = rates.find((r) => r.child_id === childId)?.amount_per_task ?? 0;
        const todayReward = completedCount * rate;
        const childTasks = tasks
          .filter((t) => t.child_id === childId)
          .sort((a, b) => a.sort_order - b.sort_order);

        // Rekap mingguan (Senin-Minggu), berdasarkan daftar tugas & tarif SAAT INI.
        let weekApproved = 0;
        let weekApplicable = 0;
        const dayBreakdown = days.map((d) => {
          const dayTasks = tasksForToday(allTaskDefs, childId, isWeekendDate(d));
          const dayEntries = weekByDate[d] ?? {};
          const dayApproved = dayTasks.filter((t) => dayEntries[`${childId}:${t.id}`]?.approved).length;
          weekApproved += dayApproved;
          weekApplicable += dayTasks.length;
          return { date: d, approved: dayApproved, total: dayTasks.length };
        });
        const weekPercent = weekApplicable ? Math.round((weekApproved / weekApplicable) * 100) : 0;
        const weekReward = weekApproved * rate;
        const childWeeklyTiers = weeklyTiers.filter((t) => t.child_id === childId);
        const reachedTier = childWeeklyTiers.find((t) => t.min_percent <= weekPercent);

        return (
          <section key={childId} className="child-card" style={{ borderColor: child.color }}>
            <h2 style={{ color: child.color }}>
              {child.emoji} {child.name}
            </h2>

            <div className="progress-row">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${percent}%`, background: child.color }} />
              </div>
              <span className="progress-text">
                {completedCount}/{today.length} selesai ({percent}%)
              </span>
            </div>

            <div className="reward-box" style={{ borderColor: child.color }}>
              🎁 Reward hari ini: <b>{fmtRp(todayReward)}</b> ({completedCount} tugas selesai &times; {fmtRp(rate)})
            </div>

            <ul className="task-list">
              {today.map((task) => {
                const entry = entries[`${childId}:${task.id}`] ?? EMPTY_ENTRY;
                return (
                  <li key={task.id}>
                    <button
                      className={`task-row ${entry.approved ? "approved" : ""}`}
                      onClick={() => toggleTask(childId, task.id)}
                      aria-pressed={entry.approved}
                    >
                      <span className="check">{entry.approved ? "✅" : "⬜"}</span>
                      <span className="label">{task.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="week-recap">
              <div className="week-recap-header">
                <button className="manager-btn" onClick={() => setWeekMonday((m) => addDays(m, -7))}>
                  ‹
                </button>
                <span className="week-recap-title">
                  {shortDateLabel(weekMonday)} – {shortDateLabel(addDays(weekMonday, 6))}
                </span>
                <button
                  className="manager-btn"
                  disabled={isCurrentWeek}
                  onClick={() => setWeekMonday((m) => addDays(m, 7))}
                >
                  ›
                </button>
              </div>
              {weekError && <div className="error-banner">{weekError}</div>}
              <div className="reward-box" style={{ borderColor: child.color }}>
                💰 Reward minggu ini: <b>{fmtRp(weekReward)}</b> ({weekApproved} tugas selesai &times; {fmtRp(rate)})
              </div>
              <div className="progress-row">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${weekPercent}%`, background: child.color }} />
                </div>
                <span className="progress-text">
                  {weekApproved}/{weekApplicable} selesai ({weekPercent}%)
                </span>
              </div>
              {reachedTier ? (
                <div className="reward-box" style={{ borderColor: child.color }}>
                  🎉 Reward mingguan (non-uang): <b>{reachedTier.label}</b>
                </div>
              ) : (
                <p className="subtitle small">Belum mencapai reward non-uang minggu ini.</p>
              )}
              <p className="subtitle small">Persentase ini untuk menentukan reward non-uang mingguan.</p>
              <div className="week-days">
                {dayBreakdown.map((d) => (
                  <div key={d.date} className="week-day-pill">
                    <span className="week-day-name">{shortDateLabel(d.date).slice(0, 3)}</span>
                    <span className="week-day-count">
                      {d.approved}/{d.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <TaskManager
              childId={childId}
              tasks={childTasks}
              onAdd={addTask}
              onSave={saveTask}
              onDelete={removeTask}
              onMove={moveTask}
            />

            <RateManager childId={childId} amountPerTask={rate} onSave={saveRate} />

            <WeeklyTierManager
              childId={childId}
              tiers={childWeeklyTiers}
              onAdd={addWeeklyTier}
              onSave={saveWeeklyTier}
              onDelete={removeWeeklyTier}
            />
          </section>
        );
      })}
    </div>
  );
}

function TaskManager({
  childId,
  tasks,
  onAdd,
  onSave,
  onDelete,
  onMove,
}: {
  childId: ChildId;
  tasks: RawTask[];
  onAdd: (childId: ChildId, label: string, weekdayOnly: boolean, weekendOnly: boolean) => Promise<void>;
  onSave: (id: number, label: string, weekdayOnly: boolean, weekendOnly: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onMove: (childId: ChildId, index: number, direction: -1 | 1) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newWeekday, setNewWeekday] = useState(false);
  const [newWeekend, setNewWeekend] = useState(false);

  return (
    <div className="manager">
      <button className="manager-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Tutup" : "Kelola daftar tugas"}
      </button>
      {open && (
        <div className="manager-body">
          {tasks.map((t, index) =>
            editingId === t.id ? (
              <TaskEditRow
                key={t.id}
                task={t}
                onCancel={() => setEditingId(null)}
                onSave={async (label, weekdayOnly, weekendOnly) => {
                  await onSave(t.id, label, weekdayOnly, weekendOnly);
                  setEditingId(null);
                }}
              />
            ) : (
              <div key={t.id} className="manager-row">
                <span className="reorder-btns">
                  <button
                    className="manager-btn"
                    disabled={index === 0}
                    onClick={() => onMove(childId, index, -1)}
                    aria-label="Naikkan urutan"
                  >
                    ▲
                  </button>
                  <button
                    className="manager-btn"
                    disabled={index === tasks.length - 1}
                    onClick={() => onMove(childId, index, 1)}
                    aria-label="Turunkan urutan"
                  >
                    ▼
                  </button>
                </span>
                <span className="manager-label">
                  {t.label}
                  {t.weekday_only && <span className="badge">weekday</span>}
                  {t.weekend_only && <span className="badge">weekend</span>}
                </span>
                <button className="manager-btn" onClick={() => setEditingId(t.id)}>
                  Edit
                </button>
                <button className="manager-btn danger" onClick={() => onDelete(t.id)}>
                  Hapus
                </button>
              </div>
            )
          )}

          <div className="manager-add">
            <input
              className="manager-input"
              placeholder="Tugas baru"
              maxLength={MAX_TASK_LABEL}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <label className="manager-check">
              <input type="checkbox" checked={newWeekday} onChange={(e) => setNewWeekday(e.target.checked)} />
              Weekday saja
            </label>
            <label className="manager-check">
              <input type="checkbox" checked={newWeekend} onChange={(e) => setNewWeekend(e.target.checked)} />
              Weekend saja
            </label>
            <button
              className="manager-btn primary"
              disabled={!newLabel.trim()}
              onClick={async () => {
                await onAdd(childId, newLabel.trim(), newWeekday, newWeekend);
                setNewLabel("");
                setNewWeekday(false);
                setNewWeekend(false);
              }}
            >
              Tambah
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskEditRow({
  task,
  onSave,
  onCancel,
}: {
  task: RawTask;
  onSave: (label: string, weekdayOnly: boolean, weekendOnly: boolean) => Promise<void>;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(task.label);
  const [weekdayOnly, setWeekdayOnly] = useState(task.weekday_only);
  const [weekendOnly, setWeekendOnly] = useState(task.weekend_only);

  return (
    <div className="manager-add">
      <input
        className="manager-input"
        maxLength={MAX_TASK_LABEL}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <label className="manager-check">
        <input type="checkbox" checked={weekdayOnly} onChange={(e) => setWeekdayOnly(e.target.checked)} />
        Weekday saja
      </label>
      <label className="manager-check">
        <input type="checkbox" checked={weekendOnly} onChange={(e) => setWeekendOnly(e.target.checked)} />
        Weekend saja
      </label>
      <button
        className="manager-btn primary"
        disabled={!label.trim()}
        onClick={() => onSave(label.trim(), weekdayOnly, weekendOnly)}
      >
        Simpan
      </button>
      <button className="manager-btn" onClick={onCancel}>
        Batal
      </button>
    </div>
  );
}

function RateManager({
  childId,
  amountPerTask,
  onSave,
}: {
  childId: ChildId;
  amountPerTask: number;
  onSave: (childId: ChildId, amountPerTask: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(amountPerTask);

  return (
    <div className="manager">
      {editing ? (
        <div className="manager-add">
          <span className="manager-label">Rp</span>
          <input
            className="manager-input amount"
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
          <span className="manager-label">/ tugas / hari</span>
          <button
            className="manager-btn primary"
            onClick={async () => {
              await onSave(childId, value);
              setEditing(false);
            }}
          >
            Simpan
          </button>
          <button
            className="manager-btn"
            onClick={() => {
              setValue(amountPerTask);
              setEditing(false);
            }}
          >
            Batal
          </button>
        </div>
      ) : (
        <button
          className="manager-toggle"
          onClick={() => {
            setValue(amountPerTask);
            setEditing(true);
          }}
        >
          Ubah tarif reward per tugas
        </button>
      )}
    </div>
  );
}

function WeeklyTierManager({
  childId,
  tiers,
  onAdd,
  onSave,
  onDelete,
}: {
  childId: ChildId;
  tiers: WeeklyTier[];
  onAdd: (childId: ChildId, minPercent: number, label: string) => Promise<void>;
  onSave: (id: number, minPercent: number, label: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newPercent, setNewPercent] = useState(85);
  const [newLabel, setNewLabel] = useState("");

  return (
    <div className="manager">
      <button className="manager-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Tutup" : "Kelola reward mingguan (non-uang)"}
      </button>
      {open && (
        <div className="manager-body">
          {tiers.map((tr) =>
            editingId === tr.id ? (
              <WeeklyTierEditRow
                key={tr.id}
                tier={tr}
                onCancel={() => setEditingId(null)}
                onSave={async (minPercent, label) => {
                  await onSave(tr.id, minPercent, label);
                  setEditingId(null);
                }}
              />
            ) : (
              <div key={tr.id} className="manager-row">
                <span className="manager-label">
                  <span className="badge">&ge;{tr.min_percent}%</span> {tr.label}
                </span>
                <button className="manager-btn" onClick={() => setEditingId(tr.id)}>
                  Edit
                </button>
                <button className="manager-btn danger" onClick={() => onDelete(tr.id)}>
                  Hapus
                </button>
              </div>
            )
          )}

          <div className="manager-add">
            <input
              className="manager-input amount"
              type="number"
              min={0}
              max={100}
              value={newPercent}
              onChange={(e) => setNewPercent(Number(e.target.value))}
            />
            <input
              className="manager-input"
              placeholder="Reward non-uang"
              maxLength={MAX_TIER_LABEL}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <button
              className="manager-btn primary"
              disabled={!newLabel.trim()}
              onClick={async () => {
                await onAdd(childId, newPercent, newLabel.trim());
                setNewLabel("");
                setNewPercent(85);
              }}
            >
              Tambah
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklyTierEditRow({
  tier,
  onSave,
  onCancel,
}: {
  tier: WeeklyTier;
  onSave: (minPercent: number, label: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [minPercent, setMinPercent] = useState(tier.min_percent);
  const [label, setLabel] = useState(tier.label);

  return (
    <div className="manager-add">
      <input
        className="manager-input amount"
        type="number"
        min={0}
        max={100}
        value={minPercent}
        onChange={(e) => setMinPercent(Number(e.target.value))}
      />
      <input
        className="manager-input"
        maxLength={MAX_TIER_LABEL}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <button
        className="manager-btn primary"
        disabled={!label.trim()}
        onClick={() => onSave(minPercent, label.trim())}
      >
        Simpan
      </button>
      <button className="manager-btn" onClick={onCancel}>
        Batal
      </button>
    </div>
  );
}
