"use client";

import { useState } from "react";
import { SITES, PRIORITIES } from "@/lib/constants";

const EMPTY = { sites: [], priority: "", comment: "", name: "", email: "", pageUrl: "", website: "" };

export default function SubmitPage() {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [doneId, setDoneId] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSite = (s) =>
    set("sites", form.sites.includes(s) ? form.sites.filter((x) => x !== s) : [...form.sites, s]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (form.sites.length === 0) return setError("Choose at least one website.");
    if (!form.priority) return setError("Choose how urgent this is.");
    if (form.comment.trim().length < 3) return setError("Please describe what needs fixing.");

    setSending(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setDoneId(data.id);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (doneId !== null) {
    return (
      <main className="wrap">
        <div className="card success">
          <div className="check">✓</div>
          <div className="big">Thanks, it&apos;s logged</div>
          <p className="lede" style={{ margin: "0 0 24px" }}>
            Ticket <strong>#{doneId}</strong> has been sent to the web team.
          </p>
          <button className="btn" onClick={() => setDoneId(null)}>
            Submit another
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="brand">
        <span className="brand-dot" /> Gharieni Web Support
      </div>
      <h1>Report a fix or change</h1>
      <p className="lede">Spotted something wrong on one of our websites, or need something updated? Tell us here.</p>

      <form className="card" onSubmit={submit} noValidate>
        {error && <div className="error">{error}</div>}

        <div className="field">
          <span className="label">Which website(s)?</span>
          <div className="chips" role="group" aria-label="Websites">
            {SITES.map((s) => {
              const on = form.sites.includes(s);
              return (
                <button type="button" key={s} className="chip" aria-pressed={on} onClick={() => toggleSite(s)}>
                  <span className="tick">{on ? "✓" : ""}</span>
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <span className="label">How urgent is it?</span>
          <div className="prio" role="group" aria-label="Priority">
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p.value}
                className={`prio-opt ${p.value}`}
                aria-pressed={form.priority === p.value}
                onClick={() => set("priority", p.value)}
              >
                <strong>
                  <span className="dot" /> {p.label}
                </strong>
                <span>{p.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="comment">
            What needs fixing?
          </label>
          <textarea
            id="comment"
            className="textarea"
            placeholder="Describe the issue or change. The more detail, the faster it gets fixed."
            value={form.comment}
            onChange={(e) => set("comment", e.target.value)}
            maxLength={5000}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="pageUrl">
            Page link <span className="opt">(optional)</span>
          </label>
          <input
            id="pageUrl"
            className="input"
            placeholder="https://…"
            value={form.pageUrl}
            onChange={(e) => set("pageUrl", e.target.value)}
          />
        </div>

        <div className="row field">
          <div>
            <label className="label" htmlFor="name">
              Your name <span className="opt">(optional)</span>
            </label>
            <input id="name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email <span className="opt">(optional)</span>
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>

        <div className="hp" aria-hidden="true">
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </div>

        <button className="btn block" disabled={sending}>
          {sending ? "Sending…" : "Submit ticket"}
        </button>
      </form>

      <div className="footer-link">
        <a href="/admin">Admin</a>
      </div>
    </main>
  );
}
