import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type Session, type SupabaseClient } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export const SITE = 'https://shopora-amber.vercel.app';
export type Product = { id: string; name: string; description: string; category: string; price_minor: number; image_url: string };
export type CartLine = { product: Product; quantity: number };
export type ShippingRate = { state: string; fee_minor: number };
export const money = (minor: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(minor / 100);
type Store = {
  client: SupabaseClient; session: Session | null; products: Product[]; rates: ShippingRate[];
  catalogLoading: boolean; reloadCatalog: () => Promise<void>;
  cart: CartLine[]; cartReady: boolean; syncing: string; error: string; catalogError: string; changing: boolean;
  change: (product: Product, delta: number) => Promise<void>; refresh: () => Promise<void>; signOut: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function useStore() { const value = useContext(Context); if (!value) throw new Error('Store not ready'); return value; }

export async function connectStore() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try { response = await fetch(`${SITE}/api/mobile/config`, { signal: controller.signal }); }
  finally { clearTimeout(timeout); }
  if (!response.ok) throw new Error('Cannot connect to Shopora. Check your internet and try again.');
  const config = await response.json();
  if (typeof config.supabaseUrl !== 'string' || typeof config.supabaseAnonKey !== 'string') throw new Error('Store configuration is unavailable.');
  return createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: {
    storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, lock: processLock, flowType: 'pkce',
  } });
}

export function StoreProvider({ client, children }: { client: SupabaseClient; children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [syncing, setSyncing] = useState('Sign in to sync your cart');
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const catalogVersion = useRef(0);
  const [changing, setChanging] = useState(false);
  const account = useRef<string | null>(null);
  const fetchVersion = useRef(0);
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);
  const alive = useRef(true);

  const fetchCatalog = useCallback(async () => {
    const version = ++catalogVersion.current;
    try {
      const [catalog, shipping] = await Promise.all([
        client.from('products').select('id,name,description,category,price_minor,image_url').eq('active', true).order('created_at', { ascending: false }),
        client.from('shipping_rates').select('state,fee_minor').eq('active', true).order('state'),
      ]);
      if (!alive.current || version !== catalogVersion.current) return;
      if (!catalog.error) setProducts(catalog.data ?? []);
      if (!shipping.error) setRates(shipping.data ?? []);
      setCatalogError(catalog.error || shipping.error ? 'Some store details could not load. Pull down or tap Retry to reconnect.' : '');
    } catch {
      if (alive.current && version === catalogVersion.current) setCatalogError('Could not reach the market. Check your connection and retry.');
    } finally {
      if (alive.current && version === catalogVersion.current) setCatalogLoading(false);
    }
  }, [client]);

  const reloadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    await fetchCatalog();
  }, [fetchCatalog]);

  const refresh = useCallback(async () => {
    const id = account.current;
    const version = ++fetchVersion.current;
    if (!id) return;
    try {
      const result = await client.from('cart_items').select('quantity,products(id,name,description,category,price_minor,image_url)').eq('user_id', id).gt('quantity', 0);
      if (!alive.current || account.current !== id || version !== fetchVersion.current) return;
      if (result.error) throw result.error;
      setCart((result.data ?? []).flatMap(row => {
        const product = (Array.isArray(row.products) ? row.products[0] : row.products) as unknown as Product | null;
        return product ? [{ product, quantity: row.quantity }] : [];
      }));
      setError(''); setCartReady(true);
    } catch {
      if (alive.current && id === account.current && version === fetchVersion.current) {
        setCartReady(false); setError('Your cart could not sync. Reconnect and tap Retry.');
      }
    }
  }, [client]);

  useEffect(() => {
    alive.current = true;
    ++fetchVersion.current;
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      const id = next?.user.id ?? null;
      if (id !== account.current) {
        account.current = id; ++fetchVersion.current;
        setCart([]); setCartReady(false); setError('');
        setSyncing(id ? 'Connecting cart…' : 'Sign in to sync your cart');
      }
      setSession(next);
    });
    // Load catalogue after the persisted auth session has initialized.
    void client.auth.getSession().then(() => { if (alive.current) void fetchCatalog(); });
    client.auth.startAutoRefresh();
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') { client.auth.startAutoRefresh(); void refresh(); void reloadCatalog(); }
      else client.auth.stopAutoRefresh();
    });
    return () => { alive.current = false; data.subscription.unsubscribe(); appState.remove(); client.auth.stopAutoRefresh(); };
  }, [client, refresh, fetchCatalog, reloadCatalog]);

  const id = session?.user.id;
  useEffect(() => {
    if (!id) return;
    let active = true;
    const channel = client.channel(`expo-cart:${id}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${id}`,
    }, () => { void refresh(); }).subscribe(status => {
      if (!active) return;
      setSyncing(status === 'SUBSCRIBED' ? 'Cart sync connected' : 'Cart reconnecting…');
      if (status === 'SUBSCRIBED') void refresh();
    });
    void refresh();
    return () => { active = false; void client.removeChannel(channel); };
  }, [client, id, refresh]);

  function change(product: Product, delta: number) {
    const customerId = account.current;
    if (!customerId || !cartReady) { setError('Sign in and wait for your cart to load.'); return Promise.resolve(); }
    pending.current++; setChanging(true);
    const work = queue.current.then(async () => {
      if (account.current !== customerId) return;
      const { error: rpcError } = await client.rpc('change_cart_item', { p_product_id: product.id, p_delta: delta });
      if (account.current !== customerId) return;
      if (rpcError) throw new Error('Cart change was not saved. Check your connection or quantity limit and try again.');
      await refresh();
    }).catch(reason => { if (account.current === customerId && alive.current) setError(reason instanceof Error ? reason.message : 'Cart change failed.'); })
      .finally(() => { pending.current--; if (alive.current) setChanging(pending.current > 0); });
    queue.current = work;
    return work;
  }
  async function signOut() {
    await queue.current;
    const result = await client.auth.signOut({ scope: 'local' });
    if (result.error) throw new Error('Could not sign out. Please try again.');
  }
  return <Context.Provider value={{ client, session, products, rates, catalogLoading, reloadCatalog, cart, cartReady, syncing, error, catalogError, changing, change, refresh, signOut }}>{children}</Context.Provider>;
}
