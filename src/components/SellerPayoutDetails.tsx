"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SellerPayoutDetails({ sellerId }: { sellerId: string }) {
 const [bank, setBank] = useState("");
 const [name, setName] = useState("");
 const [number, setNumber] = useState("");
 const [loading, setLoading] = useState(true);
 const [busy, setBusy] = useState(false);
 const [ready, setReady] = useState(false);
 const [message, setMessage] = useState("");
 useEffect(() => {
  let active = true;
  async function load() {
   try {
    const client = createClient();
    if (!client) throw new Error();
    const { data, error } = await client.from("seller_payout_accounts").select("bank_name,account_name,account_number").eq("seller_id", sellerId).maybeSingle();
    if (error) throw error;
    if (!active) return;
    setBank(data?.bank_name ?? ""); setName(data?.account_name ?? ""); setNumber(data?.account_number ?? ""); setReady(true);
   } catch { if (active) setMessage("We couldn’t load payout details. Refresh to try again."); }
   finally { if (active) setLoading(false); }
  }
  void load();
  return () => { active = false; };
 }, [sellerId]);
 async function save(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (busy || !ready) return;
  if (!/^\d{10}$/.test(number) || bank.trim().length < 2 || name.trim().length < 2) { setMessage("Enter a bank, account name, and a 10-digit Nigerian account number."); return; }
  setBusy(true); setMessage("");
  try {
   const client = createClient();
   if (!client) throw new Error();
   const { error } = await client.from("seller_payout_accounts").upsert({ seller_id: sellerId, bank_name: bank.trim(), account_name: name.trim(), account_number: number }, { onConflict: "seller_id" });
   if (error) throw error;
   setMessage("Payout details saved. Shopora must verify them before making a manual payout.");
  } catch { setMessage("Your payout details weren’t saved. Please try again."); }
  finally { setBusy(false); }
 }
 return <section className="listing-guide" aria-labelledby="payout-title"><p className="eyebrow">PRIVATE PAYOUT DETAILS</p><h2 id="payout-title">Where should we send your earnings?</h2><p>Your bank details are private to your account and Shopora administrators. They are never shown to shoppers. Saving these details does not trigger a payment or verify your bank account.</p>{loading ? <p role="status">Loading payout details…</p> : <form className="seller-form" onSubmit={save}><fieldset disabled={busy || !ready} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 18 }}><label>Bank name<input value={bank} onChange={e => setBank(e.target.value)} required minLength={2} maxLength={100} placeholder="Your Nigerian bank" autoComplete="off" /></label><label>Account name<input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={120} placeholder="Name registered with your bank" autoComplete="off" /></label><label>Account number<input value={number} onChange={e => setNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} type="text" inputMode="numeric" pattern="[0-9]{10}" required minLength={10} maxLength={10} placeholder="10-digit account number" autoComplete="off" /></label><button className="pill-button dark">{busy ? "Saving…" : "Save payout details"}</button></fieldset></form>}{message && <p role="status">{message}</p>}<p>Never enter a card number, PIN, password, or OTP. Payouts are arranged after payment and delivery are confirmed.</p></section>;
}
