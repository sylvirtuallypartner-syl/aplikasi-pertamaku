import { NextRequest, NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/db";

const MAX_LABEL_LEN = 50;

function parseId(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) ? id : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const { label, weekdayOnly, weekendOnly, sortOrder } = body ?? {};
  if (label !== undefined) {
    if (typeof label !== "string" || !label.trim() || label.length > MAX_LABEL_LEN) {
      return NextResponse.json(
        { error: `Nama tugas maksimal ${MAX_LABEL_LEN} karakter` },
        { status: 400 }
      );
    }
  }
  if (sortOrder !== undefined && !Number.isInteger(sortOrder)) {
    return NextResponse.json({ error: "Urutan tidak valid" }, { status: 400 });
  }

  try {
    await updateTask(id, {
      label: typeof label === "string" ? label.trim() : undefined,
      weekdayOnly: typeof weekdayOnly === "boolean" ? weekdayOnly : undefined,
      weekendOnly: typeof weekendOnly === "boolean" ? weekendOnly : undefined,
      sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengubah tugas" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    await deleteTask(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus tugas" },
      { status: 500 }
    );
  }
}
