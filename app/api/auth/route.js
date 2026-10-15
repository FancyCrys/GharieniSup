import { NextResponse } from "next/server";
import { checkPassword, makeToken, passwordConfigured, COOKIE_NAME, MAX_AGE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!passwordConfigured()) {
    return NextResponse.json({ error: "ADMIN_PASSWORD isn't set in Vercel yet." }, { status: 500 });
  }
  let body = {};
  try {
    body = await req.json();
  } catch {}

  if (!checkPassword(body.password)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
