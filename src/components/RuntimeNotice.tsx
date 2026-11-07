"use client";
import { createContext, useContext, useEffect, useState } from "react";
const Runtime = createContext({ preview: false });
export function useRuntime() { return useContext(Runtime); }
export function RuntimeNotice({ children }: { children: React.ReactNode }) {
  const [preview, setPreview] = useState(false);
  useEffect(() => { let active = true; void fetch("/api/store/config", { cache: "no-store" }).then(response => response.json()).then(config => { if (active) setPreview(config.preview === true); }).catch(() => {}); return () => { active = false; }; }, []);
  return <Runtime.Provider value={{ preview }}>{preview && <aside style={{ background: "#492965", color: "white", padding: "14px 20px", textAlign: "center", position: "sticky", top: 0, zIndex: 5 }}><strong>TEST SHOP — no real payments or deliveries.</strong> Emails go to the simulated test inbox. Use fictional details. <a href="/preview" style={{ color: "white", textDecoration: "underline" }}>Test checklist & inbox</a></aside>}{children}</Runtime.Provider>;
}
