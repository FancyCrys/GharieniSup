// Email notifications. Two ways to send, checked in this order:
//  1. Gmail: set GMAIL_USER + GMAIL_APP_PASSWORD (a Google "App password").
//     Sends from your Gmail to anyone; no domain needed.
//  2. Resend (https://resend.com) REST API: set RESEND_API_KEY.
// Needs RESEND_API_KEY and NOTIFY_EMAIL. NOTIFY_FROM is optional: without a verified
// domain, Resend only allows onboarding@resend.dev, which can only email the address
// you signed up to Resend with.

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const PRIORITY_LABEL = { high: "HIGH: immediate fix", medium: "Medium", low: "Low" };
const PRIORITY_COLOR = { high: "#b3261e", medium: "#a15c00", low: "#3d6b57" };

const useGmail = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
const canSend = () => useGmail() || Boolean(process.env.RESEND_API_KEY);

function defaultFrom() {
  if (useGmail()) return `"Gharieni Support" <${process.env.GMAIL_USER}>`;
  return process.env.NOTIFY_FROM || "Gharieni Support <onboarding@resend.dev>";
}

export function notifyConfigured() {
  return Boolean(canSend() && (process.env.NOTIFY_EMAIL || process.env.GMAIL_USER));
}

export async function notifyNewTicket(ticket, origin) {
  if (!notifyConfigured()) return;

  const to = (process.env.NOTIFY_EMAIL || process.env.GMAIL_USER).split(",").map((s) => s.trim()).filter(Boolean);
  const from = defaultFrom();
  const adminUrl = `${origin}/admin`;
  const urgent = ticket.priority === "high";

  const subject = `${urgent ? "🔴 URGENT " : ""}#${ticket.id} [${ticket.sites.join(", ")}] ${ticket.comment
    .replace(/\s+/g, " ")
    .slice(0, 60)}${ticket.comment.length > 60 ? "…" : ""}`;

  const files = (ticket.attachments || [])
    .map((a) => `<li><a href="${esc(a.url)}">${esc(a.name)}</a></li>`)
    .join("");

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;color:#1d1b18">
    <h2 style="margin:0 0 4px">New ticket #${ticket.id}</h2>
    <p style="margin:0 0 16px;color:#6b655c">from ${esc(ticket.name)}${ticket.email ? ` (${esc(ticket.email)})` : ""}</p>
    <p style="margin:0 0 6px"><b>Priority:</b> <span style="color:${PRIORITY_COLOR[ticket.priority]};font-weight:bold">${PRIORITY_LABEL[ticket.priority]}</span></p>
    <p style="margin:0 0 6px"><b>Website(s):</b> ${esc(ticket.sites.join(", "))}</p>
    ${ticket.pageUrl ? `<p style="margin:0 0 6px"><b>Page:</b> <a href="${esc(ticket.pageUrl)}">${esc(ticket.pageUrl)}</a></p>` : ""}
    <div style="margin:16px 0;padding:14px;background:#f5f2ec;border-radius:8px;white-space:pre-wrap">${esc(ticket.comment)}</div>
    ${files ? `<p style="margin:0 0 6px"><b>Attachments:</b></p><ul style="margin:0 0 16px">${files}</ul>` : ""}
    <a href="${esc(adminUrl)}" style="display:inline-block;background:#2f4a42;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Open dashboard</a>
  </div>`;

  const text = [
    `New ticket #${ticket.id} from ${ticket.name}${ticket.email ? ` (${ticket.email})` : ""}`,
    `Priority: ${PRIORITY_LABEL[ticket.priority]}`,
    `Website(s): ${ticket.sites.join(", ")}`,
    ticket.pageUrl ? `Page: ${ticket.pageUrl}` : null,
    "",
    ticket.comment,
    "",
    ...(ticket.attachments || []).map((a) => `Attachment: ${a.name} ${a.url}`),
    `Dashboard: ${adminUrl}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  await sendEmail({
    from,
    to,
    subject,
    html,
    text,
    ...(ticket.email ? { reply_to: ticket.email } : {}),
  });
}

async function sendEmail(payload) {
  if (useGmail()) return sendViaGmail(payload);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[notify] Resend error", res.status, body);
      let message = body;
      try {
        message = JSON.parse(body).message || body;
      } catch {}
      return { ok: false, error: `Resend ${res.status}: ${String(message).slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    // Never block a ticket because the email failed.
    console.error("[notify] failed:", err);
    return { ok: false, error: String(err.message || err) };
  }
}

// Tells the person who submitted the ticket that it's been completed.
export async function notifyTicketClosed(ticket) {
  if (!ticket.email) return null;
  if (!canSend()) return { ok: false, error: "Email isn't set up (add GMAIL_USER + GMAIL_APP_PASSWORD in Vercel)." };

  const from = defaultFrom();
  const replyTo = (process.env.NOTIFY_EMAIL || process.env.GMAIL_USER || "").split(",").map((s) => s.trim()).filter(Boolean)[0];
  const firstName = String(ticket.name || "").trim().split(/\s+/)[0] || "there";
  const summary = ticket.comment.replace(/\s+/g, " ").slice(0, 300) + (ticket.comment.length > 300 ? "…" : "");

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;color:#1d1b18">
    <div style="display:inline-block;background:#e6f0ea;color:#3d6b57;font-weight:bold;padding:4px 10px;border-radius:999px;font-size:13px">✓ Completed</div>
    <h2 style="margin:12px 0 8px">Your ticket #${ticket.id} has been closed</h2>
    <p style="margin:0 0 16px">Hi ${esc(firstName)},</p>
    <p style="margin:0 0 16px">Good news: the change you requested for <b>${esc(ticket.sites.join(", "))}</b> has been completed and your ticket is now closed.</p>
    <p style="margin:0 0 6px;color:#6b655c;font-size:13px">Your request:</p>
    <div style="margin:0 0 16px;padding:14px;background:#f5f2ec;border-radius:8px;white-space:pre-wrap">${esc(summary)}</div>
    ${ticket.pageUrl ? `<p style="margin:0 0 16px"><b>Page:</b> <a href="${esc(ticket.pageUrl)}">${esc(ticket.pageUrl)}</a></p>` : ""}
    <p style="margin:0 0 16px">If something still isn't right, just reply to this email or submit a new ticket.</p>
    <p style="margin:0;color:#6b655c">Thanks,<br>Gharieni Web Support</p>
  </div>`;

  const text = [
    `Hi ${firstName},`,
    "",
    `Your ticket #${ticket.id} for ${ticket.sites.join(", ")} has been completed and is now closed.`,
    "",
    "Your request:",
    summary,
    ticket.pageUrl ? `Page: ${ticket.pageUrl}` : null,
    "",
    "If something still isn't right, just reply to this email or submit a new ticket.",
    "",
    "Thanks,",
    "Gharieni Web Support",
  ]
    .filter((l) => l !== null)
    .join("\n");

  return sendEmail({
    from,
    to: [ticket.email],
    subject: `✓ Ticket #${ticket.id} completed`,
    html,
    text,
    ...(replyTo ? { reply_to: replyTo } : {}),
  });
}

async function sendViaGmail({ from, to, subject, html, text, reply_to }) {
  try {
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: String(process.env.GMAIL_APP_PASSWORD).replace(/\s+/g, "") },
    });
    await transport.sendMail({
      from,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
      text,
      ...(reply_to ? { replyTo: reply_to } : {}),
    });
    return { ok: true };
  } catch (err) {
    console.error("[notify] Gmail failed:", err);
    const msg = /Invalid login|BadCredentials|535/i.test(String(err.message))
      ? "Gmail rejected the login. Check GMAIL_USER and that GMAIL_APP_PASSWORD is an App password."
      : String(err.message || err);
    return { ok: false, error: `Gmail: ${msg.slice(0, 300)}` };
  }
}

// Confirms to the submitter that their ticket was received.
export async function notifyTicketReceived(ticket) {
  if (!ticket.email || !canSend()) return null;

  const from = defaultFrom();
  const replyTo = (process.env.NOTIFY_EMAIL || process.env.GMAIL_USER || "").split(",").map((s) => s.trim()).filter(Boolean)[0];
  const firstName = String(ticket.name || "").trim().split(/\s+/)[0] || "there";
  const summary = ticket.comment.replace(/\s+/g, " ").slice(0, 300) + (ticket.comment.length > 300 ? "…" : "");
  const prio = { high: "High (immediate fix)", medium: "Medium", low: "Low" }[ticket.priority] || ticket.priority;

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;color:#1d1b18">
    <div style="display:inline-block;background:#f5f2ec;color:#2f4a42;font-weight:bold;padding:4px 10px;border-radius:999px;font-size:13px">Ticket received</div>
    <h2 style="margin:12px 0 8px">We've got your ticket #${ticket.id}</h2>
    <p style="margin:0 0 16px">Hi ${esc(firstName)},</p>
    <p style="margin:0 0 16px">Thanks for reporting this. Your request has been logged and the web team will look at it. You'll get another email when it's done.</p>
    <p style="margin:0 0 6px"><b>Website(s):</b> ${esc(ticket.sites.join(", "))}</p>
    <p style="margin:0 0 16px"><b>Priority:</b> ${esc(prio)}</p>
    <p style="margin:0 0 6px;color:#6b655c;font-size:13px">Your request:</p>
    <div style="margin:0 0 16px;padding:14px;background:#f5f2ec;border-radius:8px;white-space:pre-wrap">${esc(summary)}</div>
    <p style="margin:0 0 16px">Need to add something? Just reply to this email.</p>
    <p style="margin:0;color:#6b655c">Thanks,<br>Gharieni Web Support</p>
  </div>`;

  const text = [
    `Hi ${firstName},`,
    "",
    `Thanks for reporting this. Your ticket #${ticket.id} has been logged and the web team will look at it. You'll get another email when it's done.`,
    "",
    `Website(s): ${ticket.sites.join(", ")}`,
    `Priority: ${prio}`,
    "",
    "Your request:",
    summary,
    "",
    "Need to add something? Just reply to this email.",
    "",
    "Thanks,",
    "Gharieni Web Support",
  ].join("\n");

  return sendEmail({
    from,
    to: [ticket.email],
    subject: `We've received your ticket #${ticket.id}`,
    html,
    text,
    ...(replyTo ? { reply_to: replyTo } : {}),
  });
}
