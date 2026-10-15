import crypto from "crypto";
import { cookies } from "next/headers";

export const COOKIE_NAME = "gs_admin";
export const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function secret() {
  return process.env.SESSION_SECRET || `pw:${process.env.ADMIN_PASSWORD || ""}`;
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function passwordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function checkPassword(input) {
  if (!passwordConfigured()) return false;
  return safeEqual(input || "", process.env.ADMIN_PASSWORD);
}

export function makeToken() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token) {
  if (!token || !passwordConfigured()) return false;
  const [exp, sig] = String(token).split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

export async function isAdmin() {
  const store = await cookies();
  return verifyToken(store.get(COOKIE_NAME)?.value);
}
