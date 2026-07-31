import { NextRequest, NextResponse } from "next/server";
import { setApproval } from "@/lib/db";
import { isValidDateStr } from "@/lib/date";
import { isChildId } from "@/lib/children";
import { isParentRequest } from "@/lib/auth";

// Parent-only — cuma Ibu (setelah PIN) yang boleh mengesahkan tugas anak.
export async function POST(req: NextRequest) {
  if (!isParentRequest(req)) {
    return NextResponse.json({ error: "Perlu login Orang Tua" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { childId, taskId, date, approved } = body ?? {};

  if (!isChildId(childId)) {
    return NextResponse.json({ error: "Nama anak tidak valid" }, { status: 400 });
  }
  if (!isValidDateStr(date)) {
    return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 });
  }
  if (!Number.isInteger(taskId)) {
    return NextResponse.json({ error: "Tugas tidak valid" }, { status: 400 });
  }
  if (typeof approved !== "boolean") {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  try {
    await setApproval(childId, taskId, date, approved);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan" },
      { status: 400 }
    );
  }
}
