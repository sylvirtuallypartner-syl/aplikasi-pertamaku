import { NextRequest, NextResponse } from "next/server";
import { createWeeklyTier, getAllWeeklyTiers } from "@/lib/db";
import { isParentRequest } from "@/lib/auth";
import { isChildId } from "@/lib/children";

const MAX_LABEL_LEN = 60;

// Parent-only untuk GET juga — sama seperti tarif reward harian.
export async function GET(req: NextRequest) {
  if (!isParentRequest(req)) {
    return NextResponse.json({ error: "Perlu login Orang Tua" }, { status: 401 });
  }
  try {
    const tiers = await getAllWeeklyTiers();
    return NextResponse.json({ tiers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat reward mingguan" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isParentRequest(req)) {
    return NextResponse.json({ error: "Perlu login Orang Tua" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { childId, minPercent, label } = body ?? {};

  if (!isChildId(childId)) {
    return NextResponse.json({ error: "Anak tidak valid" }, { status: 400 });
  }
  if (typeof minPercent !== "number" || minPercent < 0 || minPercent > 100) {
    return NextResponse.json({ error: "Persentase harus 0-100" }, { status: 400 });
  }
  if (typeof label !== "string" || !label.trim() || label.length > MAX_LABEL_LEN) {
    return NextResponse.json(
      { error: `Keterangan wajib diisi, maksimal ${MAX_LABEL_LEN} karakter` },
      { status: 400 }
    );
  }

  try {
    const tier = await createWeeklyTier(childId, Math.round(minPercent), label.trim());
    return NextResponse.json({ tier });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambah reward mingguan" },
      { status: 500 }
    );
  }
}
