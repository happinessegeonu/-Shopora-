"use client";
import { useState } from "react";
export default function PreviewAccess() {
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const code = String(new FormData(event.currentTarget).get("code") || "").trim();
    try {
      const response = await fetch("/api/preview/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      window.location.replace("/preview");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Please reconnect and try again."); }
    finally { setBusy(false); }
  }
  return <main className="wrap" style={{ maxWidth: 540, padding: "60px 24px" }}><p className="eyebrow">ISOLATED SHOPORA PREVIEW</p><h1>Try Shopora safely.</h1><p>This is a synthetic test shop. Emails are captured in a test inbox and no payment is taken. Use fictional names, addresses and bank details.</p><p>This access code opens the sandbox. You will create your customer or seller account separately.</p><form className="email-auth-form" onSubmit={submit}><label>Preview access code<input name="code" type="password" required autoComplete="off" /></label><button className="pill-button dark" disabled={busy}>{busy ? "Opening…" : "Open test shop"}</button>{error && <p role="alert">{error}</p>}</form></main>;
}
