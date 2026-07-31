import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { ChildId } from "./children";

let cachedSql: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (!cachedSql) {
    const url =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL_UNPOOLED;
    if (!url) {
      throw new Error(
        "DATABASE_URL belum diset. Sambungkan Vercel Postgres (Neon) di tab Storage project ini."
      );
    }
    cachedSql = neon(url);
  }
  return cachedSql;
}

// ---------- completions (status harian) ----------

export interface CompletionRow {
  child_id: string;
  task_id: number;
  done: boolean;
  approved: boolean;
}

export async function getCompletionsForDate(date: string): Promise<CompletionRow[]> {
  const sql = getSql();
  const rows = await sql`
    select child_id, task_id, done, approved
    from completions
    where entry_date = ${date}
  `;
  return rows as unknown as CompletionRow[];
}

// Dipanggil oleh anak (lapor selesai/belum). Mematikan "done" otomatis
// membatalkan approval Ibu yang sudah ada — supaya tidak ada approval basi
// menempel di laporan yang sudah berubah.
export async function setCompletion(
  childId: string,
  taskId: number,
  date: string,
  done: boolean
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into completions (child_id, task_id, entry_date, done, approved)
    values (${childId}, ${taskId}, ${date}, ${done}, false)
    on conflict (child_id, task_id, entry_date)
    do update set
      done = excluded.done,
      approved = case when excluded.done then completions.approved else false end,
      updated_at = now()
  `;
}

// Dipanggil oleh Ibu (tampilan Orang Tua, PIN). Cuma boleh mengesahkan tugas
// yang sudah dilaporkan anak (done = true) — kalau belum, tidak ada baris
// yang cocok dan fungsi ini melempar error.
export async function setApproval(
  childId: string,
  taskId: number,
  date: string,
  approved: boolean
): Promise<void> {
  const sql = getSql();
  const rows = await sql`
    update completions set approved = ${approved}, updated_at = now()
    where child_id = ${childId} and task_id = ${taskId} and entry_date = ${date} and done = true
    returning child_id
  `;
  if (rows.length === 0) {
    throw new Error("Tugas belum dilaporkan anak, belum bisa disetujui.");
  }
}

// ---------- tasks ----------

export interface TaskRow {
  id: number;
  child_id: ChildId;
  label: string;
  weekday_only: boolean;
  weekend_only: boolean;
}

export async function getAllTasks(): Promise<TaskRow[]> {
  const sql = getSql();
  const rows = await sql`
    select id, child_id, label, weekday_only, weekend_only
    from tasks
    order by child_id, sort_order, id
  `;
  return rows as unknown as TaskRow[];
}

export async function createTask(
  childId: ChildId,
  label: string,
  weekdayOnly: boolean,
  weekendOnly: boolean
): Promise<TaskRow> {
  const sql = getSql();
  const rows = await sql`
    insert into tasks (child_id, label, weekday_only, weekend_only, sort_order)
    values (
      ${childId}, ${label}, ${weekdayOnly}, ${weekendOnly},
      coalesce((select max(sort_order) + 1 from tasks where child_id = ${childId}), 0)
    )
    returning id, child_id, label, weekday_only, weekend_only
  `;
  return rows[0] as unknown as TaskRow;
}

export async function updateTask(
  id: number,
  fields: { label?: string; weekdayOnly?: boolean; weekendOnly?: boolean }
): Promise<void> {
  const sql = getSql();
  await sql`
    update tasks set
      label = coalesce(${fields.label ?? null}, label),
      weekday_only = coalesce(${fields.weekdayOnly ?? null}, weekday_only),
      weekend_only = coalesce(${fields.weekendOnly ?? null}, weekend_only)
    where id = ${id}
  `;
}

export async function deleteTask(id: number): Promise<void> {
  const sql = getSql();
  await sql`delete from tasks where id = ${id}`;
}

// ---------- reward rates (parent-only) ----------
// Reward harian = jumlah tugas selesai x tarif per tugas. Reward mingguan
// belum ditentukan, jadi belum ada di sini.

export interface RewardRateRow {
  child_id: ChildId;
  amount_per_task: number;
}

export async function getAllRewardRates(): Promise<RewardRateRow[]> {
  const sql = getSql();
  const rows = await sql`select child_id, amount_per_task from reward_rates`;
  return rows as unknown as RewardRateRow[];
}

export async function setRewardRate(childId: ChildId, amountPerTask: number): Promise<void> {
  const sql = getSql();
  await sql`
    insert into reward_rates (child_id, amount_per_task)
    values (${childId}, ${amountPerTask})
    on conflict (child_id) do update set amount_per_task = excluded.amount_per_task
  `;
}
