"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/catalog";

export type CartLine = { product: Product; quantity: number };
const storageKey = "shopora-cart-v1";

export function useCart() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartError, setCartError] = useState("");
  const [cartReady, setCartReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Guest cart — sign in to sync devices");
  const user = useRef<string | null>(null);
  const ready = useRef(false);
  const generation = useRef(0);
  const fetchVersion = useRef(0);
  const queue = useRef(Promise.resolve());
  const client = useRef<ReturnType<typeof createClient>>(null);

  const refresh = useCallback(async () => {
    const id = user.current;
    const version = ++fetchVersion.current;
    if (!id || !client.current) return;
    const { data, error } = await client.current.from("cart_items")
      .select("quantity,products(id,name,description,price_minor,category,image_url,badge,color)")
      .eq("user_id", id).gt("quantity", 0);
    if (id !== user.current || version !== fetchVersion.current) return;
    if (error) { setCartError("Your cart could not sync. Please reconnect and try again."); return; }
    setCart((data ?? []).flatMap((row) => {
      const p = (Array.isArray(row.products) ? row.products[0] : row.products) as unknown as {
        id: string; name: string; description: string; price_minor: number; category: string; image_url: string; badge?: string; color: string;
      } | null;
      return p ? [{ quantity: row.quantity, product: { id: p.id, name: p.name, description: p.description || "", price_minor: p.price_minor,
        category: p.category, image: p.image_url || "✳", badge: p.badge || undefined, color: p.color || "sand" } as Product }] : [];
    }));
    setCartError("");
  }, []);

  useEffect(() => {
    const supabase = createClient(); client.current = supabase;
    let alive = true;
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | undefined;
    const guest = () => {
      try { const saved = JSON.parse(localStorage.getItem(storageKey) || "[]"); setCart(Array.isArray(saved) ? saved : []); }
      catch { setCart([]); }
    };
    const switchAccount = async (id: string | null) => {
      if (!alive) return;
      const current = ++generation.current;
      ready.current = false; setCartReady(false); setCart([]); setCartError("");
      if (channel && supabase) void supabase.removeChannel(channel);
      user.current = id;
      if (id && supabase) {
        setSyncStatus("Connecting cart…");
        channel = supabase.channel(`cart:${id}:${current}`).on("postgres_changes", {
          event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${id}`,
        }, () => { void refresh(); }).subscribe((status) => {
          if (!alive || current !== generation.current) return;
          setSyncStatus(status === "SUBSCRIBED" ? "Cart sync connected" : "Cart reconnecting…");
          if (status === "SUBSCRIBED") void refresh();
        });
        await refresh();
      } else { guest(); setSyncStatus("Guest cart — sign in to sync devices"); }
      if (alive && current === generation.current) { ready.current = true; setCartReady(true); }
    };
    if (supabase) {
      void supabase.auth.getUser().then(({ data }) => { if (!ready.current) void switchAccount(data.user?.id ?? null); });
    } else void switchAccount(null);
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      if (id !== user.current || !ready.current) window.setTimeout(() => { void switchAccount(id); }, 0);
    }).data.subscription;
    const resume = () => { if (user.current) void refresh(); else guest(); };
    window.addEventListener("online", resume); window.addEventListener("focus", resume);
    const storage = (event: StorageEvent) => { if (!user.current && event.key === storageKey) guest(); };
    window.addEventListener("storage", storage);
    return () => { alive = false; generation.current++; subscription?.unsubscribe(); if (channel && supabase) void supabase.removeChannel(channel);
      window.removeEventListener("online", resume); window.removeEventListener("focus", resume); window.removeEventListener("storage", storage); };
  }, [refresh]);

  const change = useCallback((product: Product, delta: number) => {
    if (!ready.current) { setCartError("Wait for your cart to load."); return; }
    if (!user.current) {
      setCart((current) => {
        const found = current.find((line) => line.product.id === product.id);
        const quantity = Math.min(50, Math.max(0, (found?.quantity || 0) + delta));
        const next = [...current.filter((line) => line.product.id !== product.id), ...(quantity ? [{ product, quantity }] : [])];
        localStorage.setItem(storageKey, JSON.stringify(next)); return next;
      }); return;
    }
    const id = user.current;
    queue.current = queue.current.then(async () => {
      if (id !== user.current || !client.current) return;
      const { error } = await client.current.rpc("change_cart_item", { p_product_id: product.id, p_delta: delta });
      if (id !== user.current) return;
      if (error) { setCartError("Cart change was not saved. Check your connection and try again."); return; }
      await refresh();
    }).catch(() => { setCartError("Cart change was not saved. Please try again."); });
  }, [refresh]);

  const clearPurchased = useCallback(async (purchased: CartLine[]) => {
    await queue.current;
    if (user.current && client.current) {
      const { error } = await client.current.rpc("consume_my_cart", { p_items: purchased.map((line) => ({ productId: line.product.id, quantity: line.quantity })) });
      if (error) { setCartError("Order saved, but cart cleanup failed. Remove the purchased items before ordering again."); return; }
      await refresh();
    } else { setCart([]); localStorage.removeItem(storageKey); }
  }, [refresh]);
  return { cart, cartError, cartReady, syncStatus, change, clearPurchased };
}
