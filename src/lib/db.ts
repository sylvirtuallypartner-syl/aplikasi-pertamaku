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
}

export async function getCompletionsForDate(date: string): Promise<CompletionRow[]> {
  const sql = getSql();
  const rows = await sql`
    select child_id, task_id, done
    from completions
    where entry_date = ${date}
  `;
  return rows as unknown as CompletionRow[];
}

export async function setCompletion(
  childId: string,
  taskId: number,
  date: string,
  done: boolean
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into completions (child_id, task_id, entry_date, done)
    values (${childId}, ${taskId}, ${date}, ${done})
    on conflict (child_id, task_id, entry_date)
    do update set done = excluded.done, updated_at = now()
  `;
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
