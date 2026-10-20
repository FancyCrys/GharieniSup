"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SITES, PRIORITIES, STATUSES, PRIORITY_RANK, STATUS_RANK } from "@/lib/constants";

const label = (list, v) => list.find((x) => x.value === v)?.label || v;

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Board({ memoryWarning, uploadsWarning, blobEnv = [] }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("active");
  const [site, setSite] = useState("all");
  const [priority, setPriority] = useState("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/tickets", { cache: "no-store" });
      if (res.status === 401) return window.location.reload();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load tickets.");
      setTickets(data.tickets);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  async function patch(id, changes) {
    setTickets((ts) => ts.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    if (res.ok) {
      const { ticket } = await res.json();
      setTickets((ts) => ts.map((t) => (t.id === id ? ticket : t)));
    } else {
      setError("Couldn't save that change.");
      load();
    }
  }

  async function remove(id) {
    if (!window.confirm(`Delete ticket #${id}? This can't be undone.`)) return;
    setTickets((ts) => ts.filter((t) => t.id !== id));
    const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Couldn't delete that ticket.");
      load();
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.reload();
  }

  const stats = useMemo(
    () => ({
      open: tickets.filter((t) => t.status === "open").length,
      progress: tickets.filter((t) => t.status === "in_progress").length,
      done: tickets.filter((t) => t.status === "done").length,
      urgent: tickets.filter((t) => t.priority === "high" && t.status !== "done").length,
    }),
    [tickets]
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tickets
      .filter((t) => (status === "all" ? true : status === "active" ? t.status !== "done" : t.status === status))
      .filter((t) => site === "all" || t.sites.includes(site))
      .filter((t) => priority === "all" || t.priority === priority)
      .filter(
        (t) =>
          !needle ||
          [t.comment, t.name, ...(t.attachments || []).map((a) => a.name), t.email, t.pageUrl, t.note, `#${t.id}`].some((v) => (v || "").toLowerCase().includes(needle))
      )
      .sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          b.id - a.id
      );
  }, [tickets, status, site, priority, q]);

  return (
    <main className="wrap wide">
      <div className="topbar">
        <div>
          <div className="brand">
            <span className="brand-dot" /> Gharieni Web Support
          </div>
          <h1>Tickets</h1>
        </div>
        <div className="actions">
          <button className="btn ghost small" onClick={load}>
            Refresh
          </button>
          <button className="btn ghost small" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {memoryWarning && (
        <div className="warn">
          No database connected: tickets are only kept in memory. Connect Upstash Redis in Vercel → Storage.
        </div>
      )}
      {uploadsWarning && (
        <div className="warn">
          File uploads aren&apos;t connected: no Blob token found. Connect a Public Blob store to this project in Vercel → Storage, then redeploy.
          <br />
          Blob settings the app can see: {blobEnv.length ? blobEnv.join(", ") : "none"}
        </div>
      )}
      {error && <div className="error">{error}</div>}

      <div className="stats">
        <div className={`stat ${stats.urgent ? "alert" : ""}`}>
          <div className="n">{stats.urgent}</div>
          <div className="l">High priority, not done</div>
        </div>
        <div className="stat">
          <div className="n">{stats.open}</div>
          <div className="l">Open</div>
        </div>
        <div className="stat">
          <div className="n">{stats.progress}</div>
          <div className="l">In progress</div>
        </div>
        <div className="stat">
          <div className="n">{stats.done}</div>
          <div className="l">Done</div>
        </div>
      </div>

      <div className="filters">
        <div className="tabs" role="group" aria-label="Status filter">
          {[
            { value: "active", label: "To do" },
            ...STATUSES,
            { value: "all", label: "All" },
          ].map((s) => (
            <button key={s.value} className="tab" aria-pressed={status === s.value} onClick={() => setStatus(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
        <select className="select" value={site} onChange={(e) => setSite(e.target.value)} aria-label="Website">
          <option value="all">All websites</option>
          {SITES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input className="input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="empty">Loading tickets…</div>
      ) : shown.length === 0 ? (
        <div className="empty">{tickets.length === 0 ? "No tickets yet." : "Nothing matches these filters."}</div>
      ) : (
        <div className="list">
          {shown.map((t) => (
            <Ticket key={t.id} t={t} onPatch={patch} onDelete={remove} />
          ))}
        </div>
      )}
    </main>
  );
}

function Ticket({ t, onPatch, onDelete }) {
  const [note, setNote] = useState(t.note || "");
  const [showNote, setShowNote] = useState(Boolean(t.note));
  const done = t.status === "done";

  useEffect(() => setNote(t.note || ""), [t.note]);

  return (
    <article className={`ticket ${t.priority} ${done ? "is-done" : ""}`}>
      <div className="t-head">
        <span className="t-id">#{t.id}</span>
        <span className={`badge ${t.priority}`}>{label(PRIORITIES, t.priority)}</span>
        <span className={`badge status-${t.status}`}>{label(STATUSES, t.status)}</span>
        {t.sites.map((s) => (
          <span key={s} className="badge site">
            {s}
          </span>
        ))}
        <span className="t-meta" title={new Date(t.createdAt).toLocaleString()}>
          {timeAgo(t.createdAt)}
        </span>
      </div>

      <p className="comment">{t.comment}</p>

      {t.attachments?.length > 0 && (
        <div className="attachments">
          {t.attachments.map((a) =>
            a.type?.startsWith("image/") ? (
              <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="thumb" title={a.name}>
                <img src={a.url} alt={a.name} loading="lazy" />
              </a>
            ) : (
              <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="file-link">
                📄 {a.name}
              </a>
            )
          )}
        </div>
      )}

      {(t.name || t.email || t.pageUrl || (done && t.doneAt)) && (
        <div className="t-sub">
          {t.name && <span>From {t.name}</span>}
          {t.email && <a href={`mailto:${t.email}`}>{t.email}</a>}
          {t.pageUrl && (
            <a href={/^https?:\/\//i.test(t.pageUrl) ? t.pageUrl : `https://${t.pageUrl}`} target="_blank" rel="noreferrer">
              {t.pageUrl}
            </a>
          )}
          {done && t.doneAt && <span>Done {timeAgo(t.doneAt)}</span>}
          {done && t.closedEmail && (
            <span style={{ color: t.closedEmail.ok ? "var(--low)" : "var(--high)" }} title={t.closedEmail.error || ""}>
              {t.closedEmail.ok
                ? `✓ Completion email sent to ${t.closedEmail.to}`
                : `✗ Completion email failed: ${t.closedEmail.error || "unknown error"}`}
            </span>
          )}
        </div>
      )}

      <div className="t-foot">
        {done ? (
          <button className="btn ghost small" onClick={() => onPatch(t.id, { status: "open" })}>
            Reopen
          </button>
        ) : (
          <>
            <button
              className="btn small"
              onClick={() => onPatch(t.id, { status: "done" })}
              title={t.email ? `Also emails ${t.email} that it's completed` : undefined}
            >
              {t.email ? "✓ Mark done & notify" : "✓ Mark done"}
            </button>
            {t.status === "open" && (
              <button className="btn ghost small" onClick={() => onPatch(t.id, { status: "in_progress" })}>
                Start
              </button>
            )}
          </>
        )}
        <select
          className="select"
          style={{ width: "auto", padding: "6px 8px", fontSize: 13 }}
          value={t.priority}
          onChange={(e) => onPatch(t.id, { priority: e.target.value })}
          aria-label="Change priority"
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <button className="btn ghost small" onClick={() => setShowNote((v) => !v)}>
          {showNote ? "Hide note" : t.note ? "Note" : "Add note"}
        </button>
        <span className="spacer" />
        <button className="btn danger small" onClick={() => onDelete(t.id)}>
          Delete
        </button>
      </div>

      {showNote && (
        <textarea
          className="textarea note"
          placeholder="Private note, only you see this"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (t.note || "") && onPatch(t.id, { note })}
        />
      )}
    </article>
  );
}
