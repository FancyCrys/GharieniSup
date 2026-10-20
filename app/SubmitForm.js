"use client";

import { useRef, useState } from "react";
import { SITES, PRIORITIES } from "@/lib/constants";
import { ACCEPT_ATTR, MAX_FILES, MAX_FILE_MB, isAllowedType } from "@/lib/files";

const EMPTY = { sites: [], priority: "", comment: "", name: "", email: "", pageUrl: "", website: "" };

function prettySize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function SubmitForm({ uploads }) {
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [doneId, setDoneId] = useState(null);
  const fileInput = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSite = (s) =>
    set("sites", form.sites.includes(s) ? form.sites.filter((x) => x !== s) : [...form.sites, s]);

  function addFiles(list) {
    setError("");
    const incoming = Array.from(list || []);
    const next = [...files];
    for (const raw of incoming) {
      if (next.length >= MAX_FILES) {
        setError(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      // Pasted screenshots arrive as "image.png"; give them a clearer name.
      const file =
        raw.name === "image.png" || !raw.name
          ? new File([raw], `screenshot-${Date.now()}.png`, { type: raw.type || "image/png" })
          : raw;
      if (!isAllowedType(file.type, file.name)) {
        setError(`"${file.name}" isn't a supported file type.`);
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`"${file.name}" is over ${MAX_FILE_MB} MB.`);
        continue;
      }
      next.push({ file, key: `${file.name}-${file.size}-${Math.random()}`, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null });
    }
    setFiles(next);
  }

  function removeFile(key) {
    setFiles((fs) => {
      const f = fs.find((x) => x.key === key);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return fs.filter((x) => x.key !== key);
    });
  }

  function onPaste(e) {
    const pasted = Array.from(e.clipboardData?.files || []);
    if (pasted.length) {
      e.preventDefault();
      addFiles(pasted);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (form.name.trim().length < 2) return setError("Please enter your name.");
    if (form.sites.length === 0) return setError("Choose at least one website.");
    if (!form.priority) return setError("Choose how urgent this is.");
    if (form.comment.trim().length < 3) return setError("Please describe what needs fixing.");

    setSending(true);
    try {
      const attachments = [];
      for (let i = 0; i < files.length; i++) {
        const { file } = files[i];
        setProgress(`Uploading file ${i + 1} of ${files.length}…`);
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const blob = await up.json().catch(() => ({}));
        if (!up.ok || !blob.url) {
          throw new Error(
            up.status === 413
              ? `"${file.name}" is too large to upload.`
              : blob.error || `Couldn't upload "${file.name}" (error ${up.status}).`
          );
        }
        attachments.push({ url: blob.url, name: file.name, type: file.type, size: file.size });
      }

      setProgress("Sending…");
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, attachments }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
      setFiles([]);
      setDoneId(data.id);
      setForm(EMPTY);
    } catch (err) {
      let msg = err.message || "Upload failed. Please try again.";
      setError(msg);
    } finally {
      setSending(false);
      setProgress("");
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

      <form className="card" onSubmit={submit} onPaste={onPaste} noValidate>
        {error && <div className="error">{error}</div>}

        <div className="row field">
          <div>
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              className="input"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email <span className="opt">(optional, to hear when it&apos;s fixed)</span>
            </label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>

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

        <div className="field">
            <span className="label">
              Screenshots, photos or files <span className="opt">(optional)</span>
            </span>
            <div
              className="drop"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
            >
              <strong>Click to add files</strong> or drag them here
              <span>You can also paste a screenshot (Ctrl+V). Up to {MAX_FILES} files, {MAX_FILE_MB} MB each.</span>
            </div>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {files.length > 0 && (
              <ul className="files">
                {files.map((f) => (
                  <li key={f.key}>
                    {f.preview ? <img src={f.preview} alt="" /> : <span className="file-icon">📄</span>}
                    <span className="file-name">{f.file.name}</span>
                    <span className="file-size">{prettySize(f.file.size)}</span>
                    <button type="button" className="file-x" onClick={() => removeFile(f.key)} aria-label={`Remove ${f.file.name}`}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        <div className="hp" aria-hidden="true">
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </div>

        <button className="btn block" disabled={sending}>
          {sending ? progress || "Sending…" : "Submit ticket"}
        </button>
      </form>

      <div className="footer-link">
        <a href="/admin">Admin</a>
      </div>
    </main>
  );
}
