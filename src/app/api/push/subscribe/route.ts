import { NextRequest, NextResponse } from "next/server";
import { deletePushSubscription, savePushSubscription } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { endpoint, keys } = body ?? {};

  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json({ error: "Endpoint tidak valid" }, { status: 400 });
  }
  if (typeof keys?.p256dh !== "string" || typeof keys?.auth !== "string") {
    return NextResponse.json({ error: "Kunci langganan tidak valid" }, { status: 400 });
  }

  try {
    await savePushSubscription({ endpoint, p256dh: keys.p256dh, auth: keys.auth });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan langganan notifikasi" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { endpoint } = body ?? {};

  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json({ error: "Endpoint tidak valid" }, { status: 400 });
  }

  try {
    await deletePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus langganan notifikasi" },
      { status: 500 }
    );
  }
}
