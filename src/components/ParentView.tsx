"use client";

import { useCallback, useEffect, useState } from "react";
import { CHILD_ORDER, CHILDREN, ChildId } from "@/lib/children";
import { TaskDef, tasksForToday } from "@/lib/tasks";
import { fullDateLabel, isWeekendDate, todayStr } from "@/lib/date";
import PinPad from "./PinPad";

const STATUS_POLL_MS = 4000;
const MAX_TASK_LABEL = 50;
const MAX_TIER_LABEL = 120;

interface RawTask {
  id: number;
  child_id: ChildId;
  label: string;
  weekday_only: boolean;
  weekend_only: boolean;
}

interface RewardTier {
  id: number;
  child_id: ChildId;
  min_percent: number;
  label: string;
}

function toTaskDef(t: RawTask): TaskDef {
  return {
    id: t.id,
    childId: t.child_id,
    label: t.label,
    weekdayOnly: t.weekday_only,
    weekendOnly: t.weekend_only,
  };
}

export default function ParentView({ onExit }: { onExit: () => void }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [tasks, setTasks] = useState<RawTask[]>([]);
  const [tiers, setTiers] = useState<RewardTier[]>([]);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [tasksRes, tiersRes, statusRes] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/reward-tiers", { cache: "no-store" }),
        fetch(`/api/status?date=${todayStr()}`, { cache: "no-store" }),
      ]);
      const tasksData = await tasksRes.json();
      const tiersData = await tiersRes.json();
      const statusData = await statusRes.json();
      if (!tasksRes.ok) throw new Error(tasksData.error);
      if (!tiersRes.ok) throw new Error(tiersData.error);
      if (!statusRes.ok) throw new Error(statusData.error);
      setTasks(tasksData.tasks);
      setTiers(tiersData.tiers);
      setDone(statusData.done);
      setDate(todayStr());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    }
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/parent-auth", { cache: "no-store" });
      const data = await res.json();
      setAuthenticated(!!data.authenticated);
      setAuthChecked(true);
      if (data.authenticated) loadAll();
    })();
  }, [loadAll]);

  useEffect(() => {
    if (!authenticated) return;
    const id = setInterval(loadAll, STATUS_POLL_MS);
    return () => clearInterval(id);
  }, [authenticated, loadAll]);

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

  async function addTier(childId: ChildId, minPercent: number, label: string) {
    const res = await fetch("/api/reward-tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, minPercent, label }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menambah reward");
      return;
    }
    await loadAll();
  }

  async function saveTier(id: number, minPercent: number, label: string) {
    const res = await fetch(`/api/reward-tiers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minPercent, label }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal mengubah reward");
      return;
    }
    await loadAll();
  }

  async function removeTier(id: number) {
    const res = await fetch(`/api/reward-tiers/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menghapus reward");
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

  const weekend = isWeekendDate(date);
  const allTaskDefs = tasks.map(toTaskDef);

  return (
    <div>
      <div className="date-label">{fullDateLabel(date)}</div>
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
        const doneCount = today.filter((t) => done[`${childId}:${t.id}`]).length;
        const percent = today.length ? Math.round((doneCount / today.length) * 100) : 0;
        const childTiers = tiers.filter((tr) => tr.child_id === childId);
        const reached = childTiers.find((tr) => tr.min_percent <= percent);
        const childTasks = tasks.filter((t) => t.child_id === childId);

        return (
          <section key={childId} className="child-card" style={{ borderColor: child.color }}>
            <h2 style={{ color: child.color }}>
              {child.emoji} {child.name}
            </h2>

            <div className="progress-row">
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${percent}%`, background: child.color }}
                />
              </div>
              <span className="progress-text">
                {doneCount}/{today.length} ({percent}%)
              </span>
            </div>

            {reached && (
              <div className="reward-box" style={{ borderColor: child.color }}>
                🎁 {reached.label}
              </div>
            )}

            <ul className="task-list readonly">
              {today.map((task) => {
                const isDone = !!done[`${childId}:${task.id}`];
                return (
                  <li key={task.id}>
                    <div className={`task-row static ${isDone ? "done" : ""}`}>
                      <span className="check">{isDone ? "✓" : ""}</span>
                      <span className="label">{task.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <TaskManager
              childId={childId}
              tasks={childTasks}
              onAdd={addTask}
              onSave={saveTask}
              onDelete={removeTask}
            />

            <TierManager
              childId={childId}
              tiers={childTiers}
              onAdd={addTier}
              onSave={saveTier}
              onDelete={removeTier}
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
}: {
  childId: ChildId;
  tasks: RawTask[];
  onAdd: (childId: ChildId, label: string, weekdayOnly: boolean, weekendOnly: boolean) => Promise<void>;
  onSave: (id: number, label: string, weekdayOnly: boolean, weekendOnly: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
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
          {tasks.map((t) =>
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

function TierManager({
  childId,
  tiers,
  onAdd,
  onSave,
  onDelete,
}: {
  childId: ChildId;
  tiers: RewardTier[];
  onAdd: (childId: ChildId, minPercent: number, label: string) => Promise<void>;
  onSave: (id: number, minPercent: number, label: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newPercent, setNewPercent] = useState(100);
  const [newLabel, setNewLabel] = useState("");

  return (
    <div className="manager">
      <button className="manager-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Tutup" : "Kelola reward / konsekuensi"}
      </button>
      {open && (
        <div className="manager-body">
          {tiers.map((tr) =>
            editingId === tr.id ? (
              <TierEditRow
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
              className="manager-input percent"
              type="number"
              min={0}
              max={100}
              value={newPercent}
              onChange={(e) => setNewPercent(Number(e.target.value))}
            />
            <input
              className="manager-input"
              placeholder="Reward / konsekuensi"
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
                setNewPercent(100);
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

function TierEditRow({
  tier,
  onSave,
  onCancel,
}: {
  tier: RewardTier;
  onSave: (minPercent: number, label: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [minPercent, setMinPercent] = useState(tier.min_percent);
  const [label, setLabel] = useState(tier.label);

  return (
    <div className="manager-add">
      <input
        className="manager-input percent"
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
