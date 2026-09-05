import { NextRequest, NextResponse } from "next/server";
import { getCompletionsForDate, setCompletion } from "@/lib/db";
import { isValidDateStr } from "@/lib/date";
import { isChildId } from "@/lib/children";
import { isParentRequest } from "@/lib/auth";

// Parent-only — app ini sekarang khusus tampilan Orang Tua.
export async function GET(req: NextRequest) {
  if (!isParentRequest(req)) {
    return NextResponse.json({ error: "Perlu login Orang Tua" }, { status: 401 });
  }
  const date = req.nextUrl.searchParams.get("date");
  if (!isValidDateStr(date)) {
    return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 });
  }
  try {
    const rows = await getCompletionsForDate(date);
    const entries: Record<string, { done: boolean; approved: boolean }> = {};
    for (const row of rows) {
      entries[`${row.child_id}:${row.task_id}`] = { done: row.done, approved: row.approved };
    }
    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isParentRequest(req)) {
    return NextResponse.json({ error: "Perlu login Orang Tua" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { childId, taskId, date, done } = body ?? {};

  if (!isChildId(childId)) {
    return NextResponse.json({ error: "Nama anak tidak valid" }, { status: 400 });
  }
  if (!isValidDateStr(date)) {
    return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 });
  }
  if (!Number.isInteger(taskId)) {
    return NextResponse.json({ error: "Tugas tidak valid" }, { status: 400 });
  }
  if (typeof done !== "boolean") {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  try {
    await setCompletion(childId, taskId, date, done);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan" },
      { status: 500 }
    );
  }
}
