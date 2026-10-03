"use client";
import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const complete = () => { setInstalled(true); setPrompt(null); };
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", complete); };
  }, []);
  if (installed) return null;
  return <section className="wrap" style={{ padding: "20px 0" }}><h1>Shopora on your phone</h1>
    <p>Sign in with your website account to keep your shopping bag in sync across devices. An internet connection is required.</p>
    {prompt ? <button className="pill-button dark" onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }}>Install Shopora</button>
      : <p>To install: on Android, open the browser menu and choose Install app or Add to Home screen. On iPhone, open Safari, tap Share, then Add to Home Screen.</p>}
  </section>;
}
