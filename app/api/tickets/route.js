import { NextResponse } from "next/server";
import { SITES, PRIORITIES } from "@/lib/constants";
import { createTicket, listTickets, storageReady } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import { MAX_FILES, isBlobUrl } from "@/lib/files";
import { notifyNewTicket, notifyTicketReceived } from "@/lib/notify";

export const dynamic = "force-dynamic";

const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req) {
  if (!storageReady()) {
    return NextResponse.json(
      { error: "Ticket storage isn't connected yet. Please tell the site admin." },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real people never fill this hidden field.
  if (body.website) return NextResponse.json({ ok: true, id: 0 });

  const sites = Array.isArray(body.sites) ? body.sites.filter((s) => SITES.includes(s)) : [];
  const priority = PRIORITIES.some((p) => p.value === body.priority) ? body.priority : null;
  const comment = clean(body.comment, 5000);
  const name = clean(body.name, 120);
  const attachments = (Array.isArray(body.attachments) ? body.attachments : [])
    .filter((a) => a && isBlobUrl(a.url))
    .slice(0, MAX_FILES)
    .map((a) => ({
      url: a.url,
      name: clean(a.name, 200) || "file",
      type: clean(a.type, 120),
      size: Number(a.size) || 0,
    }));

  if (name.length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });

  if (sites.length === 0) return NextResponse.json({ error: "Choose at least one website." }, { status: 400 });
  if (!priority) return NextResponse.json({ error: "Choose a priority." }, { status: 400 });
  if (comment.length < 3) return NextResponse.json({ error: "Please describe what needs fixing." }, { status: 400 });

  const ticket = await createTicket({
    sites,
    priority,
    comment,
    name,
    email: clean(body.email, 200),
    pageUrl: clean(body.pageUrl, 1000),
    attachments,
  });

  // Alert the admin and confirm to the submitter (in parallel; failures never block the ticket).
  await Promise.allSettled([notifyNewTicket(ticket, new URL(req.url).origin), notifyTicketReceived(ticket)]);

  return NextResponse.json({ ok: true, id: ticket.id });
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tickets = await listTickets();
  return NextResponse.json({ tickets });
}
