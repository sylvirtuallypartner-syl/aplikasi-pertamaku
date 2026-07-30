import { NextRequest, NextResponse } from "next/server";
import { getCompletionsForDate, setCompletion } from "@/lib/db";
import { isValidDateStr } from "@/lib/date";
import { isChildId, CHILDREN } from "@/lib/tasks";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!isValidDateStr(date)) {
    return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 });
  }
  try {
    const rows = await getCompletionsForDate(date);
    const done: Record<string, boolean> = {};
    for (const row of rows) {
      done[`${row.child_id}:${row.task_id}`] = row.done;
    }
    return NextResponse.json({ done });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { childId, taskId, date, done } = body ?? {};

  if (!isChildId(childId)) {
    return NextResponse.json({ error: "Nama anak tidak valid" }, { status: 400 });
  }
  if (!isValidDateStr(date)) {
    return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 });
  }
  const taskExists = CHILDREN[childId].tasks.some((t) => t.id === taskId);
  if (!taskExists) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 400 });
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
