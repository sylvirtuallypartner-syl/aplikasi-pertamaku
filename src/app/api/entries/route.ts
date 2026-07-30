import { NextRequest, NextResponse } from "next/server";
import { CHILDREN, isChildKey, maxValueForChild } from "@/lib/tasks";
import { isValidDateStr } from "@/lib/date";
import { getEntriesForRange, upsertEntry } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  const start = searchParams.get("start");
  const end = searchParams.get("end") ?? start;

  if (!isChildKey(childId)) {
    return NextResponse.json({ error: "childId tidak valid" }, { status: 400 });
  }
  if (!isValidDateStr(start) || !isValidDateStr(end)) {
    return NextResponse.json({ error: "start/end tidak valid" }, { status: 400 });
  }

  try {
    const rows = await getEntriesForRange(childId, start, end);
    return NextResponse.json({ rows });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal mengambil data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const childId = body?.childId;
  const taskId = body?.taskId;
  const date = body?.date;
  const value = body?.value;

  if (!isChildKey(childId)) {
    return NextResponse.json({ error: "childId tidak valid" }, { status: 400 });
  }
  const child = CHILDREN[childId];
  if (typeof taskId !== "string" || !child.tasks.some((t) => t.id === taskId)) {
    return NextResponse.json({ error: "taskId tidak valid" }, { status: 400 });
  }
  if (!isValidDateStr(date)) {
    return NextResponse.json({ error: "date tidak valid" }, { status: 400 });
  }
  const maxVal = maxValueForChild(child);
  const v = Number(value);
  if (!Number.isInteger(v) || v < 0 || v > maxVal) {
    return NextResponse.json({ error: "value tidak valid" }, { status: 400 });
  }

  try {
    await upsertEntry(childId, taskId, date, v);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal menyimpan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
