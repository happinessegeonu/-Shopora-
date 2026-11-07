"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authChanged, jsonRequest, storeConfiguration } from "@/lib/store-client";
type Mode = "signin" | "signup" | "forgot" | "confirm";
type Props = { email: string | null; initialMessage: string; onClose(): void; onSignedIn(email: string): void; onSignOut(): Promise<void> };
export function AccountDialog({ email: signedInEmail, initialMessage, onClose, onSignedIn, onSignOut }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin"), [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(initialMessage), [error, setError] = useState(Boolean(initialMessage));
  const [cooldown, setCooldown] = useState(0), [google, setGoogle] = useState(false);
  const dialog = useRef<HTMLDivElement>(null), lock = useRef(false);
  useEffect(() => {
    let active = true;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    if (new URLSearchParams(location.search).has("reset")) setMode("forgot");
    void storeConfiguration().then(config => { if (active) setGoogle(config.google); }).catch(() => {});
    return () => { active = false; previous?.focus(); };
  }, []);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(value => value - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return;
    const form = new FormData(event.currentTarget);
    lock.current = true; setBusy(true); setMessage(""); setError(false);
    try {
      const action = mode === "signin" ? "login" : mode === "signup" ? "register" : mode === "forgot" ? "forgot" : "resend";
      const result = await jsonRequest(`/api/owned-auth/${action}`, { email: email.trim(), password: form.get("password") });
      if (mode === "signin") {
        authChanged(); onSignedIn(result.user.email);
        if (new URLSearchParams(location.search).get("next") === "/sell") router.push("/sell");
      } else { setMessage(result.message); setCooldown(60); }
    } catch (reason) { setError(true); setMessage(reason instanceof Error ? reason.message : "Please reconnect and try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  const changeMode = (next: Mode) => { setMode(next); setMessage(""); setError(false); };
  async function logout() { setBusy(true); try { await onSignOut(); } catch { setError(true); setMessage("Could not sign out. Reconnect and try again."); } finally { setBusy(false); } }
  return <div className="overlay auth-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}><div ref={dialog} className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" tabIndex={-1} onKeyDown={event => {
    if (event.key === "Escape" && !busy) onClose();
    if (event.key === "Tab") {
      const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]'); if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }}><button className="close auth-close" disabled={busy} onClick={onClose} aria-label="Close account">×</button><p className="eyebrow">YOUR SHOPORA ACCOUNT</p><h2 id="auth-title">{signedInEmail ? "Your account." : mode === "signup" ? "Create your account." : mode === "forgot" ? "Reset your password." : mode === "confirm" ? "Confirm your email." : "Welcome back."}</h2>
    {signedInEmail ? <><p className="auth-copy">Signed in as {signedInEmail}</p><button className="pill-button dark full" disabled={busy} onClick={() => void logout()}>Sign out</button></> : <>
      {google && (mode === "signin" || mode === "signup") && <><a className="google-auth-button" href={`/api/owned-auth/google/start?next=${encodeURIComponent(typeof location !== "undefined" && new URLSearchParams(location.search).get("next") === "/sell" ? "/sell" : "/")}`}><span className="google-mark">G</span>Continue with Google</a><div className="auth-divider"><span>or use your email</span></div></>}
      <p className="auth-copy">{mode === "signup" ? "We will email you a link to verify your address and choose your password." : mode === "forgot" ? "Enter your account email for a password reset link. Existing customers can also use this to set up access." : mode === "confirm" ? "Request a fresh account confirmation link. Use the newest email." : "Sign in to keep your cart and seller space together."}</p>
      <form className="email-auth-form" onSubmit={submit}><label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /></label>{mode === "signin" && <label>Password<input name="password" type="password" required maxLength={256} autoComplete="current-password" disabled={busy} /></label>}<button className="pill-button dark full" disabled={busy || (mode !== "signin" && cooldown > 0)}>{busy ? "Please wait…" : mode !== "signin" && cooldown ? `Resend available in ${cooldown}s` : mode === "signin" ? "Sign in with email" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Resend confirmation"}</button></form>
      <p className="auth-switch">{mode === "signin" ? <><button disabled={busy} onClick={() => changeMode("forgot")}>Forgot password?</button><span> · </span><button disabled={busy} onClick={() => changeMode("confirm")}>Resend confirmation</button><br /><button disabled={busy} onClick={() => changeMode("signup")}>Create an account</button></> : <button disabled={busy} onClick={() => changeMode("signin")}>Back to sign in</button>}</p>
    </>}{message && <p className={`auth-message${error ? " auth-message-error" : ""}`} role={error ? "alert" : "status"}>{message}</p>}
  </div></div>;
}
