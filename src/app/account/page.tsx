"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authChanged } from "@/lib/store-client";

type Mode = "login" | "register" | "forgot" | "verify" | "reset";
export default function OwnedAccountPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const token = useRef("");
  const lock = useRef(false);
  useEffect(() => {
    if (new URLSearchParams(location.search).get("mode") === "forgot") setMode("forgot");
    if (new URLSearchParams(location.search).has("legacy")) setMessage("Your old sign-in link has been retired. Request a new password link for your existing account.");
    const readLink = () => {
      const fragment = new URLSearchParams(location.hash.slice(1));
      const purpose = fragment.get("purpose");
      if (purpose === "verify" || purpose === "reset") {
        token.current = fragment.get("token") || "";
        setMode(purpose); setMessage("");
        history.replaceState(history.state, "", location.pathname + location.search);
      }
    };
    readLink(); window.addEventListener("hashchange", readLink);
    let active = true;
    fetch("/api/owned-auth/session", { cache: "no-store" }).then(async response => {
      const result = await response.json();
      if (active) { if (!response.ok) throw new Error(result.error); setUser(result.user); }
    }).catch(() => { if (active) setMessage("Account service is unavailable. Please try again later."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.removeEventListener("hashchange", readLink); };
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    if ((mode === "verify" || mode === "reset") && values.get("password") !== values.get("confirmation")) { setMessage("Passwords must match."); return; }
    lock.current = true; setBusy(true); setMessage("");
    const action = user && mode !== "verify" && mode !== "reset" ? "logout" : mode;
    try {
      const response = await fetch(`/api/owned-auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: values.get("password"), token: token.current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      authChanged();
      if (action === "login") { setUser(result.user); setMessage("You’re signed in."); }
      else if (action === "logout") { setUser(null); setMessage("Signed out."); }
      else { setMessage(result.message); if (mode === "verify" || mode === "reset") { setUser(null); setMode("login"); token.current = ""; } }
      form.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connection failed. Please try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  const completing = mode === "verify" || mode === "reset";
  return <main style={{ maxWidth: 480, margin: "60px auto", padding: 24 }}>
    <Link href="/">← Shopora</Link>
    <h1 style={{ margin: "24px 0" }}>{completing ? "Choose your password" : user ? "Your account" : mode === "register" ? "Create an account" : mode === "forgot" ? "Reset your password" : "Welcome back"}</h1>
    {loading ? <p>Loading your account…</p> : <>
      {user && !completing && <><p>Signed in as {user.email}</p><p><Link href="/orders">Your orders</Link> · <Link href="/sell">Seller space</Link> · <Link href="/#shop">Keep shopping</Link></p></>}
      {mode === "register" && <p>We’ll email you a link to verify your address and choose your password.</p>}
      <form className="email-auth-form" onSubmit={submit}>
        {(!user || completing) && <>
          {!completing && <label>Email<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /></label>}
          {(mode === "login" || completing) && <label>Password<input name="password" type="password" required minLength={completing ? 15 : 1} maxLength={256} autoComplete={completing ? "new-password" : "current-password"} disabled={busy} /></label>}
          {completing && <><p>Use at least 15 characters. A long, unique passphrase works well.</p><label>Confirm password<input name="confirmation" type="password" required minLength={15} maxLength={256} autoComplete="new-password" disabled={busy} /></label></>}
        </>}
        <button className="pill-button dark full" disabled={busy}>{busy ? "Please wait…" : completing ? "Save password" : user ? "Sign out" : mode === "login" ? "Sign in" : "Send email link"}</button>
      </form>
      {!user && <div className="auth-switch" style={{ marginTop: 20 }}>{(["login", "register", "forgot"] as const).filter(value => value !== mode).map(value => <button key={value} disabled={busy} style={{ marginRight: 16 }} onClick={() => { setMode(value); setMessage(""); }}>{value === "login" ? "Sign in" : value === "register" ? "Create account / resend link" : "Forgot password?"}</button>)}</div>}
    </>}
    {message && <p role="status" style={{ marginTop: 20 }}>{message}</p>}
  </main>;
}
