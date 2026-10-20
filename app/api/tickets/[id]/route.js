import { NextResponse } from "next/server";
import { STATUSES, PRIORITIES } from "@/lib/constants";
import { del } from "@vercel/blob";
import { updateTicket, deleteTicket, getTicket } from "@/lib/store";
import { blobAuth, uploadsEnabled } from "@/lib/files";
import { isAdmin } from "@/lib/auth";
import { notifyTicketClosed } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const changes = {};
  if (STATUSES.some((s) => s.value === body.status)) changes.status = body.status;
  if (PRIORITIES.some((p) => p.value === body.priority)) changes.priority = body.priority;
  if (typeof body.note === "string") changes.note = body.note.slice(0, 5000);

  const before = await getTicket(id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let ticket = await updateTicket(id, changes);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Just marked done → let the submitter know (only if they left an email).
  if (changes.status === "done" && before.status !== "done" && ticket.email) {
    const result = await notifyTicketClosed(ticket);
    if (result) {
      ticket = await updateTicket(id, {
        closedEmail: { to: ticket.email, at: new Date().toISOString(), ok: result.ok, error: result.error || null },
      });
    }
  }

  return NextResponse.json({ ticket });
}

export async function DELETE(req, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ticket = await getTicket(id);
  const urls = (ticket?.attachments || []).map((a) => a.url);
  if (urls.length && uploadsEnabled()) {
    try {
      await del(urls, blobAuth(req));
    } catch {}
  }
  await deleteTicket(id);
  return NextResponse.json({ ok: true });
}
