import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { EntryRow } from "./recap";

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

export async function getEntriesForRange(
  childId: string,
  start: string,
  end: string
): Promise<EntryRow[]> {
  const sql = getSql();
  const rows = await sql`
    select task_id, entry_date::text as entry_date, value
    from entries
    where child_id = ${childId} and entry_date between ${start} and ${end}
    order by entry_date, task_id
  `;
  return rows as unknown as EntryRow[];
}

export async function upsertEntry(
  childId: string,
  taskId: string,
  date: string,
  value: number
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into entries (child_id, task_id, entry_date, value)
    values (${childId}, ${taskId}, ${date}, ${value})
    on conflict (child_id, task_id, entry_date)
    do update set value = excluded.value, updated_at = now()
  `;
}

export async function resetDay(childId: string, date: string): Promise<void> {
  const sql = getSql();
  await sql`delete from entries where child_id = ${childId} and entry_date = ${date}`;
}
