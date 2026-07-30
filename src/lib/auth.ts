import { createHmac, timingSafeEqual } from "crypto";

export const PARENT_COOKIE = "misi_ortu_session";
const SESSION_HOURS = 12;

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyPin(candidate: string): boolean {
  const pin = process.env.PARENT_PIN;
  if (!pin || !candidate) return false;
  return safeEqualStrings(candidate, pin);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionToken(): string {
  const secret = process.env.PARENT_PIN;
  if (!secret) throw new Error("PARENT_PIN belum diset di environment variables.");
  const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = String(expires);
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  const secret = process.env.PARENT_PIN;
  if (!secret || !token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload, secret);
  if (!safeEqualStrings(sig, expected)) return false;
  const expires = Number(payload);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  return true;
}

export const PARENT_SESSION_MAX_AGE = SESSION_HOURS * 3600;
