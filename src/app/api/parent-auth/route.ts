import { NextRequest, NextResponse } from "next/server";
import {
  PARENT_COOKIE,
  PARENT_SESSION_MAX_AGE,
  createSessionToken,
  verifyPin,
  verifySessionToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PARENT_COOKIE)?.value;
  return NextResponse.json({ authenticated: verifySessionToken(token) });
}

export async function POST(req: NextRequest) {
  if (!process.env.PARENT_PIN) {
    return NextResponse.json(
      { ok: false, error: "PARENT_PIN belum diset di environment variables." },
      { status: 500 }
    );
  }
  const body = await req.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";

  if (!verifyPin(pin)) {
    return NextResponse.json({ ok: false, error: "PIN salah" }, { status: 401 });
  }

  const token = createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PARENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PARENT_SESSION_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PARENT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
