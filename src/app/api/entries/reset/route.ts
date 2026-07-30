import { NextRequest, NextResponse } from "next/server";
import { isChildKey } from "@/lib/tasks";
import { isValidDateStr } from "@/lib/date";
import { resetDay } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const childId = body?.childId;
  const date = body?.date;

  if (!isChildKey(childId)) {
    return NextResponse.json({ error: "childId tidak valid" }, { status: 400 });
  }
  if (!isValidDateStr(date)) {
    return NextResponse.json({ error: "date tidak valid" }, { status: 400 });
  }

  try {
    await resetDay(childId, date);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal reset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
