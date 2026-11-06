"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, passwordError } from "@/lib/auth-feedback";

type Props = { email: string | null; initialMessage: string; onClose(): void; onSignedIn(email: string): void; onSignOut(): Promise<void> };
export function AccountDialog({ email: signedInEmail, initialMessage, onClose, onSignedIn, onSignOut }: Props) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "confirm">("signin");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [isError, setIsError] = useState(Boolean(initialMessage));
  const [resend, setResend] = useState<"signup" | "reset" | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const lock = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (new URLSearchParams(location.search).has("reset")) setMode("forgot");
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  function feedback(text: string, error = false) { setMessage(text); setIsError(error); }
  function changeMode(next: typeof mode) { if (busy) return; setMode(next); setResend(null); feedback(""); }
  function rememberReturn() {
    const next = new URLSearchParams(location.search).get("next") === "/sell" ? "/sell" : location.pathname === "/app" ? "/app" : "/";
    document.cookie = `shopora_auth_next=${encodeURIComponent(next)}; Path=/; Max-Age=3600; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }
  function redirectAfterLogin() {
    if (new URLSearchParams(location.search).get("next") === "/sell") location.assign("/sell");
  }
  async function google() {
    if (lock.current) return;
    lock.current = true; setBusy(true); feedback("");
    try {
      if (navigator.userAgent.includes("ShoporaAndroid/")) throw new Error("Open Shopora in your phone browser to use Google sign-in, or sign in here with email.");
      const client = createClient(); if (!client) throw new Error("Sign-in is temporarily unavailable.");
      rememberReturn();
      const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
      if (error) feedback(authErrorMessage(error), true);
    } catch (error) { feedback(authErrorMessage(error instanceof Error ? error : {}), true); }
    finally { lock.current = false; setBusy(false); }
  }
  async function requestReset(address: string) {
    const client = createClient(); if (!client) throw new Error("Password reset is temporarily unavailable.");
    // Use the existing allowed callback URL; the server permits only fixed destinations.
    document.cookie = `shopora_auth_next=${encodeURIComponent("/auth/reset-password")}; Path=/; Max-Age=3600; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    const { error } = await client.auth.resetPasswordForEmail(address, { redirectTo: `${location.origin}/auth/callback` });
    if (error) throw error;
    setSentTo(address); setResend("reset"); setCooldown(60);
    feedback("If this address has a Shopora account, we’ve requested a reset email. Check your inbox and spam. Open the newest link in this same browser.");
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return;
    const values = new FormData(event.currentTarget);
    const address = email.trim();
    const password = String(values.get("password") || "");
    if (mode === "signup") { const issue = passwordError(password, String(values.get("confirmation") || "")); if (issue) { feedback(issue, true); return; } }
    if ((mode === "forgot" || mode === "confirm") && cooldown) return;
    lock.current = true; setBusy(true); feedback(""); setResend(null);
    try {
      if (mode === "forgot") { await requestReset(address); return; }
      const client = createClient(); if (!client) throw new Error("Sign-in is temporarily unavailable.");
      if (mode === "signup" || mode === "confirm") rememberReturn();
      if (mode === "confirm") {
        const { error } = await client.auth.resend({ type: "signup", email: address, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
        if (error) throw error;
        setSentTo(address); setResend("signup"); setCooldown(60); feedback("If this account needs confirmation, a new email has been requested. Check your inbox and spam."); return;
      }
      const result = mode === "signup" ? await client.auth.signUp({ email: address, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } }) : await client.auth.signInWithPassword({ email: address, password });
      if (result.error) {
        feedback(authErrorMessage(result.error), true);
        if (result.error.code === "email_not_confirmed") { setSentTo(address); setResend("signup"); }
        return;
      }
      if (!result.data.session) {
        setSentTo(address); setResend("signup"); setCooldown(60);
        feedback("Check your inbox and spam for a confirmation email. Confirm your address before signing in. If you already have an account, sign in or reset your password.");
        return;
      }
      document.cookie = "shopora_auth_next=; Path=/; Max-Age=0; SameSite=Lax";
      onSignedIn(result.data.user?.email || address); redirectAfterLogin();
    } catch (error) { feedback(authErrorMessage(error instanceof Error ? error : {}), true); }
    finally { lock.current = false; setBusy(false); }
  }
  async function resendEmail() {
    if (lock.current || cooldown || !resend || !sentTo) return;
    lock.current = true; setBusy(true); feedback("");
    try {
      if (resend === "reset") { await requestReset(sentTo); return; }
      const client = createClient(); if (!client) throw new Error("Email confirmation is temporarily unavailable.");
      rememberReturn();
      const { error } = await client.auth.resend({ type: "signup", email: sentTo, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) throw error;
      setCooldown(60); feedback("If this account needs confirmation, a new email has been requested. Check your inbox and spam and use the newest link.");
    } catch (error) { feedback(authErrorMessage(error instanceof Error ? error : {}), true); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="overlay auth-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}><div ref={dialog} className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" tabIndex={-1} onKeyDown={event => {
    if (event.key === "Escape" && !busy) onClose();
    if (event.key === "Tab") {
      const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }}><button className="close auth-close" onClick={onClose} disabled={busy} aria-label="Close account">×</button><p className="eyebrow">YOUR SHOPORA ACCOUNT</p><h2 id="auth-title">{signedInEmail ? "You’re signed in." : mode === "forgot" ? "Reset your password." : mode === "confirm" ? "Confirm your email." : mode === "signup" ? "Create your account." : "Welcome back."}</h2>
    {signedInEmail ? <><p className="auth-copy">Signed in as {signedInEmail}</p><button className="pill-button dark full" onClick={onSignOut}>Sign out ↗</button></> : <>
      {(mode === "signin" || mode === "signup") && <><button className="google-auth-button" onClick={google} disabled={busy}><span className="google-mark">G</span>Continue with Google</button><div className="auth-divider"><span>or use your email</span></div></>}
      {mode === "confirm" && <p className="auth-copy">Enter the email you used to create your account. We can resend its confirmation link.</p>}
      {mode === "forgot" && <p className="auth-copy">Enter your account email and we’ll send you a password reset link.</p>}
      <form key={mode} className="email-auth-form" onSubmit={submit}><label>Email address<input name="email" type="email" required autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} placeholder="you@example.com" /></label>
      {(mode === "signin" || mode === "signup") && <label>Password<input name="password" type="password" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} disabled={busy} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} /></label>}
      {mode === "signup" && <label>Confirm password<input name="confirmation" type="password" required minLength={8} autoComplete="new-password" disabled={busy} placeholder="Enter your password again" /></label>}
      <button className="pill-button dark full" disabled={busy || ((mode === "forgot" || mode === "confirm") && cooldown > 0)}>{busy ? "One moment…" : mode === "forgot" ? "Send reset link" : mode === "confirm" ? "Send confirmation email" : mode === "signup" ? "Create account" : "Sign in with email"}<span>↗</span></button></form>
      <p className="auth-switch">{(mode === "signin" || mode === "signup") && <><button disabled={busy} onClick={() => changeMode("forgot")}>Forgot password?</button><span> · </span><button disabled={busy} onClick={() => changeMode("confirm")}>Resend confirmation</button><br /></>}{mode === "signin" ? <>New to Shopora? <button disabled={busy} onClick={() => changeMode("signup")}>Create an account</button></> : <button disabled={busy} onClick={() => changeMode("signin")}>Back to sign in</button>}</p>
    </>}
    {message && <div className="auth-feedback"><p className={`auth-message${isError ? " auth-message-error" : ""}`} role={isError ? "alert" : "status"}>{message}</p></div>}
    {resend && <div className="auth-feedback"><button className="auth-resend" onClick={resendEmail} disabled={busy || cooldown > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sentTo)}>{cooldown ? `Resend available in ${cooldown}s` : resend === "reset" ? "Resend reset email" : "Resend confirmation email"}</button></div>}
  </div></div>;
}
