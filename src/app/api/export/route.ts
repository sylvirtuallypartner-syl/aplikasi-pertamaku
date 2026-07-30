import { NextRequest, NextResponse } from "next/server";
import { CHILDREN, isChildKey } from "@/lib/tasks";
import { isValidDateStr } from "@/lib/date";
import { getEntriesForRange } from "@/lib/db";
import { PARENT_COOKIE, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authed = verifySessionToken(req.cookies.get(PARENT_COOKIE)?.value);
  if (!authed) {
    return NextResponse.json({ error: "Perlu masuk mode Ortu dulu" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!isChildKey(childId)) {
    return NextResponse.json({ error: "childId tidak valid" }, { status: 400 });
  }
  if (!isValidDateStr(start) || !isValidDateStr(end)) {
    return NextResponse.json({ error: "start/end tidak valid" }, { status: 400 });
  }

  try {
    const child = CHILDREN[childId];
    const labelById = Object.fromEntries(child.tasks.map((t) => [t.id, t.label]));
    const rows = await getEntriesForRange(childId, start, end);

    const header = "tanggal,tugas_id,tugas,nilai\n";
    const lines = rows.map((r) => {
      const label = (labelById[r.task_id] ?? r.task_id).replace(/"/g, '""');
      return `${r.entry_date},${r.task_id},"${label}",${r.value}`;
    });
    const csv = "﻿" + header + lines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="misi-harian-${childId}-${start}_${end}.csv"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal export";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
