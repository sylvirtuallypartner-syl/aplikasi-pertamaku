import { NextRequest, NextResponse } from "next/server";
import { createTask, getAllTasks } from "@/lib/db";
import { isChildId } from "@/lib/children";

const MAX_LABEL_LEN = 50;

export async function GET() {
  try {
    const tasks = await getAllTasks();
    return NextResponse.json({ tasks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat tugas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { childId, label, weekdayOnly, weekendOnly } = body ?? {};

  if (!isChildId(childId)) {
    return NextResponse.json({ error: "Anak tidak valid" }, { status: 400 });
  }
  if (typeof label !== "string" || !label.trim() || label.length > MAX_LABEL_LEN) {
    return NextResponse.json(
      { error: `Nama tugas wajib diisi, maksimal ${MAX_LABEL_LEN} karakter` },
      { status: 400 }
    );
  }

  try {
    const task = await createTask(childId, label.trim(), !!weekdayOnly, !!weekendOnly);
    return NextResponse.json({ task });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah tugas" },
      { status: 500 }
    );
  }
}
