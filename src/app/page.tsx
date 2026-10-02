"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { demoProducts, formatPrice, type Product } from "@/lib/catalog";

type CartLine = { product: Product; quantity: number };
const storageKey = "shopora-cart-v1";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [category, setCategory] = useState("Everything");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setCart(JSON.parse(saved) as CartLine[]);
    } catch { localStorage.removeItem(storageKey); }
    const supabase = createClient();
    if (!supabase) return;
    void supabase.from("products").select("id,name,description,price_minor,category,image_url,badge,color").eq("active", true).order("created_at", { ascending: false }).then(({ data }) => {
      if (data?.length) setProducts(data.map((p) => ({ id: p.id, name: p.name, description: p.description || "", price_minor: p.price_minor, category: p.category || "Everything", image: p.image_url || "✳", badge: p.badge || undefined, color: p.color || "sand" })));
    });
    void supabase.auth.getUser().then(({ data }) => setSessionEmail(data.user?.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSessionEmail(session?.user.email ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(cart)); }, [cart]);
  const categories = useMemo(() => ["Everything", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const visible = products.filter((p) => (category === "Everything" || p.category === category) && `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cart.reduce((sum, line) => sum + line.product.price_minor * line.quantity, 0);

  function add(product: Product) {
    setCart((current) => {
      const found = current.find((line) => line.product.id === product.id);
      return found ? current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { product, quantity: 1 }];
    });
    setDrawer(true);
  }
  function change(id: string, delta: number) {
    setCart((current) => current.map((line) => line.product.id === id ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0));
  }
  async function googleSignIn() {
    const supabase = createClient();
    if (!supabase) { setAuthMessage("Connect the Supabase project first to enable sign-in."); return; }
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
    if (error) setAuthMessage(error.message);
  }
  async function emailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true); setAuthMessage("");
    const supabase = createClient();
    if (!supabase) { setAuthMessage("Connect the Supabase project first to enable sign-in."); setAuthBusy(false); return; }
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") || "").trim();
    const password = String(values.get("password") || "");
    try {
      const result = authMode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) { setAuthMessage(result.error.message); return; }
      if (authMode === "signup" && !result.data.session) {
        setAuthMessage("Check your inbox for the confirmation link, then come back here to sign in.");
        return;
      }
      setSessionEmail(result.data.user?.email ?? email);
      setAuthOpen(false);
      setAuthMessage("");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "We couldn’t reach Supabase. Please try again.");
    } finally { setAuthBusy(false); }
  }
  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setSessionEmail(null); setAuthOpen(false);
  }
  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), name: form.get("name"), address: form.get("address"), items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn’t place your order.");
      setCart([]); setCheckout(false); setDrawer(false); setMessage(result.emailSent ? `Order ${result.orderNumber} received. We’ve sent a confirmation to ${form.get("email")}. Payment is pending; we’ll share payment options shortly.` : `Order ${result.orderNumber} received. Email confirmation could not be sent yet. Payment is pending; we’ll share payment options shortly.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  return <main>
    <div className="announcement">Good finds for every kind of day <span>✳</span> Shop electronics, fragrance, and style</div>
    <header className="header wrap">
      <a className="brand" href="#top" aria-label="Shopora home">shopora<span>✳</span></a>
      <nav className="nav"><a href="#shop">Shop all</a><a href="#story">Our little story</a></nav>
      <div className="header-actions"><button className="icon-button account" onClick={() => { setAuthMessage(""); setAuthOpen(true); }} aria-label={sessionEmail ? "Open account" : "Sign in or create an account"}>{sessionEmail ? sessionEmail.split("@")[0] : "Sign in"}</button><button className="bag-button" onClick={() => setDrawer(true)}>Bag <span>{count}</span></button><button className="menu-button" onClick={() => setDrawer(true)} aria-label="Open bag">☰</button></div>
    </header>
    <section className="hero wrap" id="top">
      <div className="hero-copy"><p className="eyebrow">A GOOD THING, EVERY DAY</p><h1>Find your<br /><em>everyday</em> lovely.</h1><p className="hero-description">Shop the tech, scents, and styles that make everyday yours.</p><a className="pill-button dark" href="#shop">Come on in <span>↗</span></a><div className="hero-note"><span className="note-star">✳</span><span>A good find.<br />A little delight.</span></div></div>
      <div className="hero-art" aria-label="Illustration of a thoughtfully curated still life"><div className="sun"></div><div className="art-card card-one"><span>✿</span><small>slow<br />mornings</small></div><div className="art-vase"><div className="stem stem-one">⌁</div><div className="stem stem-two">⌁</div><div className="vase-neck"></div><div className="vase-body"></div></div><div className="art-cup">◒</div><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><span className="hero-spark spark-one">✳</span><span className="hero-spark spark-two">✳</span><div className="art-caption">the little<br />things matter</div></div>
    </section>
    <section className="ticker" aria-label="Shopora promise"><div>GOOD THINGS, THOUGHTFULLY FOUND <span>✳</span> MADE FOR REAL LIFE <span>✳</span> A LITTLE JOY, DELIVERED <span>✳</span> GOOD THINGS, THOUGHTFULLY FOUND <span>✳</span> MADE FOR REAL LIFE <span>✳</span></div></section>
    <section className="shop-section wrap" id="shop"><div className="section-heading"><div><p className="eyebrow">A FEW OF OUR FAVOURITES</p><h2>Meet the <em>good stuff.</em></h2></div><label className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a little something" aria-label="Search products" /></label></div>
      <div className="filters">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={category === item ? "filter active" : "filter"}>{item}</button>)}</div>
      <div className="product-grid">{visible.map((product, index) => <article className="product-card" key={product.id}><button className={`product-art ${product.color}`} onClick={() => add(product)} aria-label={`Add ${product.name} to bag`}>{product.image.startsWith("/") ? <img className={`product-photo photo-${product.category.toLowerCase()}`} src={product.image} alt={product.name} /> : <span className="art-glyph">{product.image}</span>}{product.badge && <span className="badge">{product.badge}</span>}<span className="quick-add">Add to bag <b>+</b></span><small className="product-index">{String(index + 1).padStart(2, "0")}</small></button><div className="product-meta"><div><p>{product.category}</p><h3>{product.name}</h3></div><strong>{formatPrice(product.price_minor)}</strong></div><p className="product-description">{product.description}</p></article>)}</div>
      {visible.length === 0 && <p className="empty-state">No little treasures found. Try another search.</p>}
    </section>
    <section className="story-section" id="story"><div className="story-art"><div className="story-flower">✿</div><span>COLLECT THE<br />EVERYDAY</span><div className="story-circle"></div></div><div className="story-copy"><p className="eyebrow">A NOTE FROM US</p><h2>Good finds for<br /><em>your everyday.</em></h2><p>From useful tech to a fragrance that feels like you, Shopora brings together things worth reaching for — chosen to make your day a little better.</p><a href="#shop" className="text-link">Find your next favourite <span>↗</span></a></div></section>
    <section className="newsletter wrap"><div><p className="eyebrow">A SMALL NOTE, NOW AND THEN</p><h2>Good things in your <em>inbox.</em></h2><p>New finds, gentle inspiration, and first dibs on the good stuff.</p></div><a className="pill-button dark" href="mailto:hello@shopora.store?subject=Shopora%20newsletter">Keep me posted <span>↗</span></a></section>
    <footer className="footer"><div className="wrap footer-inner"><a className="brand" href="#top">shopora<span>✳</span></a><p>Good things, thoughtfully found.</p><div><a href="#shop">Shop</a><a href="mailto:hello@shopora.store">Say hello</a><span>© Shopora 2026</span></div></div></footer>

    {message && <div className="toast" role="status"><span>{message}</span><button onClick={() => setMessage("")} aria-label="Dismiss">×</button></div>}
    {authOpen && <div className="overlay auth-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}><section className="auth-modal" aria-labelledby="auth-title"><button className="close auth-close" onClick={() => setAuthOpen(false)} aria-label="Close sign in">×</button><p className="eyebrow">YOUR SHOPORA ACCOUNT</p><h2 id="auth-title">{sessionEmail ? "You’re signed in." : authMode === "signup" ? "Make yourself at home." : "Welcome back."}</h2>{sessionEmail ? <><p className="auth-copy">Signed in as {sessionEmail}</p><button className="pill-button dark full" onClick={signOut}>Sign out <span>↗</span></button></> : <><button type="button" className="google-auth-button" onClick={googleSignIn}><span className="google-mark">G</span> Continue with Google</button><div className="auth-divider"><span>or use your email</span></div><form className="email-auth-form" onSubmit={emailAuth}><label>Email address<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label><label>Password<input name="password" type="password" required minLength={8} autoComplete={authMode === "signup" ? "new-password" : "current-password"} placeholder="At least 8 characters" /></label><button className="pill-button dark full" disabled={authBusy}>{authBusy ? "One moment…" : authMode === "signup" ? "Create account" : "Sign in with email"}<span>↗</span></button></form><p className="auth-switch">{authMode === "signup" ? "Already have an account?" : "New to Shopora?"} <button onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setAuthMessage(""); }}>{authMode === "signup" ? "Sign in" : "Create an account"}</button></p></>}{authMessage && <p className="auth-message" role="status">{authMessage}</p>}</section></div>}
    {drawer && <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) { setDrawer(false); setCheckout(false); } }}><aside className="drawer"><div className="drawer-head"><div><p className="eyebrow">YOUR LITTLE FINDS</p><h2>{checkout ? "Almost yours." : `Your bag (${count})`}</h2></div><button className="close" onClick={() => { setDrawer(false); setCheckout(false); }} aria-label="Close bag">×</button></div>
      {checkout ? <><form className="checkout-form" onSubmit={submitOrder}><label>Your name<input name="name" required autoComplete="name" placeholder="Name" /></label><label>Email for your confirmation<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label><label>Delivery address<textarea name="address" required autoComplete="street-address" placeholder="Street, city, state" rows={3} /></label><div className="checkout-summary"><span>Order total</span><strong>{formatPrice(total)}</strong></div><p className="pending-note">Pay by bank transfer after placing your order. We’ll show the account details and send them to your email. Your order remains pending until payment is confirmed.</p><button className="pill-button dark full" disabled={busy}>{busy ? "Placing your order…" : "Place order"}<span>↗</span></button></form><button className="back-link" onClick={() => setCheckout(false)}>← Back to your bag</button></> : cart.length === 0 ? <div className="empty-bag"><span>✳</span><p>Your bag’s taking a little breather.</p><button className="pill-button dark" onClick={() => setDrawer(false)}>Find something lovely <span>↗</span></button></div> : <><div className="cart-lines">{cart.map((line) => <div className="cart-line" key={line.product.id}><div className={`cart-thumb ${line.product.color}`}>{line.product.image.startsWith("/") ? <img className="cart-photo" src={line.product.image} alt="" /> : line.product.image}</div><div className="line-info"><h3>{line.product.name}</h3><p>{formatPrice(line.product.price_minor)}</p><div className="quantity"><button onClick={() => change(line.product.id, -1)} aria-label="Decrease quantity">−</button><span>{line.quantity}</span><button onClick={() => change(line.product.id, 1)} aria-label="Increase quantity">+</button></div></div><strong>{formatPrice(line.product.price_minor * line.quantity)}</strong></div>)}</div><div className="drawer-bottom"><div className="subtotal"><span>Subtotal</span><strong>{formatPrice(total)}</strong></div><p>Shipping and any applicable taxes are calculated at checkout.</p><a className="pill-button dark full" href="/checkout">Continue to checkout <span>↗</span></a><button className="back-link" onClick={() => setDrawer(false)}>Keep looking around</button></div></>}
    </aside></div>}
  </main>;
}
