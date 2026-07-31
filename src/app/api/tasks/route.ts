import { NextRequest, NextResponse } from "next/server";
import { createTask, getAllTasks } from "@/lib/db";
import { isParentRequest } from "@/lib/auth";
import { isChildId } from "@/lib/children";

const MAX_LABEL_LEN = 50;

// Publik — daftar tugas perlu terlihat di tampilan anak juga.
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

// Parent-only — hanya Orang Tua (PIN) yang boleh menambah tugas.
export async function POST(req: NextRequest) {
  if (!isParentRequest(req)) {
    return NextResponse.json({ error: "Perlu login Orang Tua" }, { status: 401 });
  }

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
