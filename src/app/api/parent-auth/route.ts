import { NextRequest, NextResponse } from "next/server";
import { PARENT_COOKIE, createSessionToken, isParentRequest, verifyPin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  return NextResponse.json({ authenticated: isParentRequest(req) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const pin = body?.pin;
  if (typeof pin !== "string") {
    return NextResponse.json({ error: "PIN tidak valid" }, { status: 400 });
  }

  let ok: boolean;
  try {
    ok = verifyPin(pin);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PARENT_PIN belum diset dengan benar." },
      { status: 500 }
    );
  }

  if (!ok) {
    return NextResponse.json({ error: "PIN salah" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(PARENT_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PARENT_COOKIE);
  return res;
}
