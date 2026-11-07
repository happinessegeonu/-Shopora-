"use client";
export type StoreUser = { id: string; email?: string };
export type CatalogueRow = { id: string; name: string; description: string; price_minor: number; category: string; image_url: string; badge?: string; color: string };
export type StoreConfiguration = { owned: boolean; enabled: boolean; google: boolean };
export async function jsonRequest<T = any>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...(body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Shopora could not complete this request.");
  return result;
}
export function storeConfiguration() { return jsonRequest<StoreConfiguration>("/api/store/config"); }
export async function storeUser(): Promise<StoreUser | null> { return (await jsonRequest("/api/owned-auth/session")).user; }
export function authChanged() {
  window.dispatchEvent(new Event("shopora-auth-changed"));
  try { localStorage.setItem("shopora-auth-change", `${Date.now()}-${Math.random()}`); } catch { /* HttpOnly session still works when storage is blocked. */ }
}
export function watchUser(callback: (user: StoreUser | null) => void, failure?: () => void) {
  let active = true, version = 0;
  const refresh = () => { const current = ++version; void storeUser().then(user => { if (active && current === version) callback(user); }).catch(() => { if (active && current === version) failure?.(); }); };
  refresh();
  window.addEventListener("shopora-auth-changed", refresh); window.addEventListener("focus", refresh);
  window.addEventListener("storage", refresh);
  return () => { active = false; window.removeEventListener("shopora-auth-changed", refresh); window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); };
}
export async function storeLogout() { await jsonRequest("/api/owned-auth/logout", {}); authChanged(); }
export function storeCatalog() { return jsonRequest<{ products: CatalogueRow[]; rates: { state: string; fee_minor: number }[] }>("/api/store/catalog"); }
export async function storeCart(_userId: string) { return (await jsonRequest("/api/store/cart")).data; }
export async function storeCartChange(productId: string, delta: number) { await jsonRequest("/api/store/cart", { productId, delta }); }
export async function storeRead(resource: "listings" | "payouts" | "reviews", _userId?: string) { return (await jsonRequest(`/api/store/${resource}`)).data; }
export async function storeWrite(resource: "payouts" | "reviews", body: Record<string, unknown>) { return jsonRequest(`/api/store/${resource}`, body); }
export async function storeListing(_userId: string, values: FormData) {
  const file = values.get("photo") as File;
  const upload = await fetch("/api/store/media", { method: "POST", headers: { "Content-Type": file.type }, body: file });
  const image = await upload.json(); if (!upload.ok) throw new Error(image.error || "Photo upload failed.");
  return (await jsonRequest("/api/store/listings", { store_name: values.get("store"), contact_phone: values.get("phone"), name: values.get("name"), description: values.get("description"), category: values.get("category"), price_minor: Math.round(Number(values.get("price")) * 100), image_url: image.url, commissionAgreement: values.get("commissionAgreement") === "on" })).data;
}
