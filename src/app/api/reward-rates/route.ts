import { NextRequest, NextResponse } from "next/server";
import { getAllRewardRates, setRewardRate } from "@/lib/db";
import { isChildId } from "@/lib/children";

export async function GET() {
  try {
    const rates = await getAllRewardRates();
    return NextResponse.json({ rates });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat reward" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { childId, amountPerTask } = body ?? {};

  if (!isChildId(childId)) {
    return NextResponse.json({ error: "Anak tidak valid" }, { status: 400 });
  }
  if (typeof amountPerTask !== "number" || !Number.isFinite(amountPerTask) || amountPerTask < 0) {
    return NextResponse.json({ error: "Jumlah reward tidak valid" }, { status: 400 });
  }

  try {
    await setRewardRate(childId, Math.round(amountPerTask));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan reward" },
      { status: 500 }
    );
  }
}
