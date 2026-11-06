"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, passwordError } from "@/lib/auth-feedback";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    const client = createClient();
    if (!client) { setChecking(false); setMessage("Password reset is temporarily unavailable."); return; }
    void client.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setReady(!error && Boolean(data.user));
      if (error || !data.user) setMessage("This reset link has expired or is unavailable in this browser. Request a new link and open it in the browser where you requested it.");
    }).catch(() => { if (active) setMessage("We couldn’t check your reset link. Refresh and try again."); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!ready || busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("password") || "");
    const issue = passwordError(password, String(values.get("confirmation") || ""));
    if (issue) { setMessage(issue); return; }
    setBusy(true); setMessage("");
    try {
      const client = createClient(); if (!client) throw new Error("Password reset is temporarily unavailable.");
      const { error } = await client.auth.updateUser({ password });
      if (error) { setMessage(authErrorMessage(error)); return; }
      form.reset(); setDone(true);
    } catch (error) { setMessage(authErrorMessage(error instanceof Error ? error : {})); }
    finally { setBusy(false); }
  }
  return <main className="password-reset-page"><a className="brand" href="/">shopora<span>✳</span></a><section className="auth-modal"><p className="eyebrow">YOUR SHOPORA ACCOUNT</p><h1>{done ? "Password updated." : "Choose a new password."}</h1>{checking ? <p role="status">Checking your reset link…</p> : done ? <><p role="status">Your new password is saved. Use it for both the website and mobile app.</p><a className="pill-button dark full" href="/?signin=1">Back to Shopora ↗</a></> : <>{ready && <form className="email-auth-form" onSubmit={submit}><label>New password<input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" disabled={busy} /></label><label>Confirm new password<input name="confirmation" type="password" required minLength={8} autoComplete="new-password" disabled={busy} /></label><button className="pill-button dark full" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button></form>}{message && <p className="auth-message auth-message-error" role="alert">{message}</p>}<a className="auth-resend" href="/?signin=1&reset=1">Request another reset email</a></>}</section></main>;
}
