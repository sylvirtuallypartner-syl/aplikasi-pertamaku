import { neon, NeonQueryFunction } from "@neondatabase/serverless";

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

export interface CompletionRow {
  child_id: string;
  task_id: string;
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
  taskId: string,
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
