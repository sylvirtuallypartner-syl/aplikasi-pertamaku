import crypto from "crypto";
import { NextRequest } from "next/server";

export const PARENT_COOKIE = "kt_parent";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam

function getPin(): string {
  const pin = process.env.PARENT_PIN;
  if (!pin) {
    throw new Error("PARENT_PIN belum diset di environment variable.");
  }
  return pin;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getPin()).update(payload).digest("hex");
}

export function verifyPin(input: string): boolean {
  const pin = getPin();
  const a = Buffer.from(input);
  const b = Buffer.from(pin);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSessionToken(): string {
  const expires = String(Date.now() + SESSION_TTL_MS);
  return `${expires}.${sign(expires)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig) return false;
  if (sign(expires) !== sig) return false;
  const expiresAt = Number(expires);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export function isParentRequest(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(PARENT_COOKIE)?.value);
}
