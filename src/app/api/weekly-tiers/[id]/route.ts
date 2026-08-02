import { NextRequest, NextResponse } from "next/server";
import { deleteWeeklyTier, updateWeeklyTier } from "@/lib/db";
import { isParentRequest } from "@/lib/auth";

const MAX_LABEL_LEN = 60;

function parseId(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) ? id : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isParentRequest(req)) {
    return NextResponse.json({ error: "Perlu login Orang Tua" }, { status: 401 });
  }
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const { minPercent, label } = body ?? {};
  if (minPercent !== undefined && (typeof minPercent !== "number" || minPercent < 0 || minPercent > 100)) {
    return NextResponse.json({ error: "Persentase harus 0-100" }, { status: 400 });
  }
  if (label !== undefined && (typeof label !== "string" || !label.trim() || label.length > MAX_LABEL_LEN)) {
    return NextResponse.json(
      { error: `Keterangan maksimal ${MAX_LABEL_LEN} karakter` },
      { status: 400 }
    );
  }

  try {
    await updateWeeklyTier(id, {
      minPercent: typeof minPercent === "number" ? Math.round(minPercent) : undefined,
      label: typeof label === "string" ? label.trim() : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengubah reward mingguan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isParentRequest(req)) {
    return NextResponse.json({ error: "Perlu login Orang Tua" }, { status: 401 });
  }
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    await deleteWeeklyTier(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus reward mingguan" },
      { status: 500 }
    );
  }
}
