// Sends a "new ticket" email through Resend (https://resend.com) using its REST API.
// Needs RESEND_API_KEY and NOTIFY_EMAIL. NOTIFY_FROM is optional: without a verified
// domain, Resend only allows onboarding@resend.dev, which can only email the address
// you signed up to Resend with.

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const PRIORITY_LABEL = { high: "HIGH: immediate fix", medium: "Medium", low: "Low" };
const PRIORITY_COLOR = { high: "#b3261e", medium: "#a15c00", low: "#3d6b57" };

export function notifyConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL);
}

export async function notifyNewTicket(ticket, origin) {
  if (!notifyConfigured()) return;

  const to = process.env.NOTIFY_EMAIL.split(",").map((s) => s.trim()).filter(Boolean);
  const from = process.env.NOTIFY_FROM || "Gharieni Support <onboarding@resend.dev>";
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

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
        ...(ticket.email ? { reply_to: ticket.email } : {}),
      }),
    });
    if (!res.ok) console.error("[notify] Resend error", res.status, await res.text());
  } catch (err) {
    // Never block a ticket because the email failed.
    console.error("[notify] failed:", err);
  }
}
