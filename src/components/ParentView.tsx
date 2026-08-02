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
import { EMPTY_ENTRY, StatusEntry, statusIcon, statusRowClass } from "@/lib/status";
import PinPad from "./PinPad";

const STATUS_POLL_MS = 4000;
const MAX_TASK_LABEL = 50;
const HISTORY_DAYS = 14;

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

export default function ParentView({ onExit }: { onExit: () => void }) {
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
  const pendingApprove = useRef<Set<string>>(new Set());

  const loadAll = useCallback(async () => {
    const target = followToday ? todayStr() : viewDate;
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
      // Baris yang lagi disetujui/dibatalkan (masih menunggu respons server)
      // dipertahankan nilai optimistiknya, supaya tidak ketiban snapshot lama
      // dari approve() lain yang berjalan bersamaan.
      setEntries((prevEntries) => {
        const next = { ...statusData.entries };
        for (const key of pendingApprove.current) {
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

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/parent-auth", { cache: "no-store" });
      const data = await res.json();
      setAuthenticated(!!data.authenticated);
      setAuthChecked(true);
      if (data.authenticated) {
        loadAll();
        loadWeek();
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
      setFollowToday(true);
      setViewDate(todayStr());
    } else {
      setFollowToday(false);
      setViewDate(value);
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
    return null;
  }

  async function handleLogout() {
    await fetch("/api/parent-auth", { method: "DELETE" });
    onExit();
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

  async function approve(childId: ChildId, taskId: number, approved: boolean) {
    const key = `${childId}:${taskId}`;
    const prev = entries[key] ?? EMPTY_ENTRY;
    pendingApprove.current.add(key);
    setEntries((p) => ({ ...p, [key]: { ...prev, approved } }));
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, taskId, date: viewDate, approved }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEntries((p) => ({ ...p, [key]: prev }));
        setError(data.error || "Gagal menyimpan persetujuan");
        return;
      }
    } finally {
      pendingApprove.current.delete(key);
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

  if (!authChecked) return null;

  if (!authenticated) {
    return (
      <div>
        <PinPad onSubmit={handlePinSubmit} />
        <button className="change-btn" style={{ display: "block", margin: "16px auto 0" }} onClick={onExit}>
          Batal
        </button>
      </div>
    );
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
        <span>
          Mode: <b>Orang Tua</b>
        </span>
        <button className="change-btn" onClick={handleLogout}>
          Keluar
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {CHILD_ORDER.map((childId) => {
        const child = CHILDREN[childId];
        const today = tasksForToday(allTaskDefs, childId, weekend);
        const doneCount = today.filter((t) => entries[`${childId}:${t.id}`]?.done).length;
        const approvedCount = today.filter((t) => entries[`${childId}:${t.id}`]?.approved).length;
        const percent = today.length ? Math.round((doneCount / today.length) * 100) : 0;
        const rate = rates.find((r) => r.child_id === childId)?.amount_per_task ?? 0;
        const todayReward = approvedCount * rate;
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
                {doneCount}/{today.length} dilaporkan ({percent}%)
              </span>
            </div>
            <div className="progress-row">
              <span className="progress-text">{approvedCount}/{today.length} disetujui Ibu</span>
            </div>

            <div className="reward-box" style={{ borderColor: child.color }}>
              🎁 Reward hari ini: <b>{fmtRp(todayReward)}</b> ({approvedCount} tugas disetujui &times; {fmtRp(rate)})
            </div>

            <ul className="task-list readonly">
              {today.map((task) => {
                const entry = entries[`${childId}:${task.id}`] ?? EMPTY_ENTRY;
                return (
                  <li key={task.id}>
                    <button
                      className={`task-row static ${statusRowClass(entry)} ${entry.done ? "" : "locked"}`}
                      disabled={!entry.done}
                      onClick={() => entry.done && approve(childId, task.id, !entry.approved)}
                    >
                      <span className="check">{statusIcon(entry)}</span>
                      <span className="label">{task.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="subtitle small">Tap tugas yang sudah dilaporkan (✅) untuk mengesahkan/batalkan (✅✅).</p>

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
                💰 Reward minggu ini: <b>{fmtRp(weekReward)}</b> ({weekApproved} tugas disetujui &times; {fmtRp(rate)})
              </div>
              <div className="progress-row">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${weekPercent}%`, background: child.color }} />
                </div>
                <span className="progress-text">
                  {weekApproved}/{weekApplicable} disetujui ({weekPercent}%)
                </span>
              </div>
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
