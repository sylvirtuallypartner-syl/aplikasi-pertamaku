import { NextRequest, NextResponse } from "next/server";
import { getCompletionsForRange } from "@/lib/db";
import { isValidDateStr } from "@/lib/date";
import { isParentRequest } from "@/lib/auth";

// Parent-only — dipakai untuk rekap mingguan (reward & % tugas disetujui).
export async function GET(req: NextRequest) {
  if (!isParentRequest(req)) {
    return NextResponse.json({ error: "Perlu login Orang Tua" }, { status: 401 });
  }

  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!isValidDateStr(start) || !isValidDateStr(end)) {
    return NextResponse.json({ error: "Rentang tanggal tidak valid" }, { status: 400 });
  }

  try {
    const rows = await getCompletionsForRange(start, end);
    const byDate: Record<string, Record<string, { done: boolean; approved: boolean }>> = {};
    for (const row of rows) {
      byDate[row.entry_date] ??= {};
      byDate[row.entry_date][`${row.child_id}:${row.task_id}`] = {
        done: row.done,
        approved: row.approved,
      };
    }
    return NextResponse.json({ byDate });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat rekap" },
      { status: 500 }
    );
  }
}
