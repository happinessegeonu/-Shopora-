"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { storeCart, storeCartChange, watchUser } from "@/lib/store-client";
import type { Product } from "@/lib/catalog";
export type CartLine = { product: Product; quantity: number };
const storageKey = "shopora-cart-v1";
export function useCart() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartError, setCartError] = useState("");
  const [cartReady, setCartReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Checking your account…");
  const user = useRef<string | null>(null), ready = useRef(false), alive = useRef(false);
  const generation = useRef(0), fetchVersion = useRef(0), queue = useRef(Promise.resolve());
  const refresh = useCallback(async () => {
    const id = user.current, current = generation.current, version = ++fetchVersion.current;
    if (!id) return;
    try {
      const data = await storeCart(id);
      if (!alive.current || id !== user.current || current !== generation.current || version !== fetchVersion.current) return;
      setCart((data ?? []).flatMap((row: any) => {
        const p = Array.isArray(row.products) ? row.products[0] : row.products;
        return p ? [{ quantity: row.quantity, product: { id: p.id, name: p.name, description: p.description || "", price_minor: Number(p.price_minor), category: p.category, image: p.image_url || "✳", badge: p.badge || undefined, color: p.color || "sand" } }] : [];
      }));
      ready.current = true; setCartReady(true); setCartError(""); setSyncStatus("Cart sync active · updates within a few seconds");
    } catch {
      if (alive.current && current === generation.current) { ready.current = false; setCartReady(false); setCartError("Your cart could not sync. Please reconnect and try again."); setSyncStatus("Cart reconnecting…"); }
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const guest = () => { try { const saved = JSON.parse(localStorage.getItem(storageKey) || "[]"); setCart(Array.isArray(saved) ? saved : []); } catch { setCart([]); } };
    const stop = watchUser(next => {
      const id = next?.id ?? null;
      if (id === user.current && ready.current) return;
      generation.current++; user.current = id; ready.current = false; setCartReady(false); setCart([]); setCartError("");
      if (id) { setSyncStatus("Connecting cart…"); void refresh(); }
      else { guest(); ready.current = true; setCartReady(true); setSyncStatus("Guest cart — sign in to sync devices"); }
    }, () => { ready.current = false; setCartReady(false); setCartError("Could not check your account. Reconnect and refresh."); });
    const resume = () => { if (user.current) void refresh(); else if (ready.current) guest(); };
    const storage = (event: StorageEvent) => { if (!user.current && ready.current && event.key === storageKey) guest(); };
    const invalidate = () => { generation.current++; };
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && user.current) void refresh(); }, 2000);
    window.addEventListener("online", resume); window.addEventListener("focus", resume); window.addEventListener("storage", storage);
    return () => { alive.current = false; invalidate(); stop(); clearInterval(timer); window.removeEventListener("online", resume); window.removeEventListener("focus", resume); window.removeEventListener("storage", storage); };
  }, [refresh]);
  const change = useCallback((product: Product, delta: number) => {
    if (!ready.current) { setCartError("Wait for your cart to load."); return; }
    if (!user.current) {
      setCart(current => {
        const quantity = Math.min(50, Math.max(0, (current.find(line => line.product.id === product.id)?.quantity || 0) + delta));
        const next = [...current.filter(line => line.product.id !== product.id), ...(quantity ? [{ product, quantity }] : [])];
        localStorage.setItem(storageKey, JSON.stringify(next)); return next;
      }); return;
    }
    const id = user.current, current = generation.current;
    queue.current = queue.current.then(async () => {
      if (id !== user.current || current !== generation.current) return;
      await storeCartChange(product.id, delta);
      if (id === user.current && current === generation.current) await refresh();
    }).catch(() => { if (current === generation.current) setCartError("Cart change was not saved. Please try again."); });
  }, [refresh]);
  const clearPurchased = useCallback(async (_purchased: CartLine[], cartCleared = true) => {
    await queue.current;
    if (user.current) { await refresh(); if (!cartCleared) setCartError("Order saved, but cart cleanup failed. Remove purchased items before ordering again."); }
    else { setCart([]); localStorage.removeItem(storageKey); }
  }, [refresh]);
  return { cart, cartError, cartReady, syncStatus, change, clearPurchased };
}
