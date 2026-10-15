"use client";

import { useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.reload();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error || "Login failed.");
    setBusy(false);
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginTop: 20 }}>
      {error && <div className="error">{error}</div>}
      <div className="field">
        <label className="label" htmlFor="pw">
          Password
        </label>
        <input
          id="pw"
          type="password"
          className="input"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button className="btn block" disabled={busy || !password}>
        {busy ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
