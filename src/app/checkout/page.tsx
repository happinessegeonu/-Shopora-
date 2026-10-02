"use client";
import { ProductImage } from "@/components/ProductImage";

import { useEffect, useState } from "react";
import { formatPrice, type Product } from "@/lib/catalog";
import { bankTransfer } from "@/lib/payment";

type CartLine = { product: Product; quantity: number };
const storageKey = "shopora-cart-v1";

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [placed, setPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [placedTotal, setPlacedTotal] = useState(0);
  useEffect(() => {
    try { const saved = localStorage.getItem(storageKey); if (saved) setCart(JSON.parse(saved) as CartLine[]); }
    catch { localStorage.removeItem(storageKey); }
  }, []);
  const total = cart.reduce((sum, line) => sum + line.product.price_minor * line.quantity, 0);

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.length) { setNotice("Your bag is empty. Head back to the shop to find something lovely."); return; }
    setBusy(true); setNotice("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fields.get("email"), name: fields.get("name"), address: fields.get("address"), items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn’t place your order.");
      localStorage.removeItem(storageKey); setPlacedTotal(total); setCart([]); setPlaced(true); setOrderNumber(result.orderNumber);
      setNotice(result.emailSent ? `Order ${result.orderNumber} received. A confirmation is on its way. We’ll confirm delivery fees and the final amount before you transfer.` : `Order ${result.orderNumber} received. We couldn’t send the confirmation email yet. We’ll confirm delivery fees and the final amount before you transfer.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="checkout-page"><header className="checkout-header wrap"><a className="brand" href="/">shopora<span>✳</span></a><a className="back-link checkout-back" href="/#shop">← Back to shopping</a></header><div className="checkout-layout wrap"><section className="checkout-main"><p className="eyebrow">THE LAST LITTLE STEP</p><h1>Almost <em>yours.</em></h1><p className="checkout-intro">Leave us the details and we’ll take good care of the rest.</p>{notice && <div className={placed ? "order-notice success" : "order-notice"} role="status">{notice}</div>}{placed ? <><section className="bank-transfer"><p className="eyebrow">BANK TRANSFER DETAILS</p><h2>Payment instructions</h2><dl><div><dt>Items subtotal</dt><dd>{formatPrice(placedTotal)}</dd></div><div><dt>Bank</dt><dd>{bankTransfer.bank}</dd></div><div><dt>Account name</dt><dd>{bankTransfer.accountName}</dd></div><div><dt>Account number</dt><dd>{bankTransfer.accountNumber}</dd></div></dl><p className="transfer-reference">Use <strong>{orderNumber}</strong> as the transfer narration so we can match your payment.</p><p className="checkout-terms">Please wait for us to confirm delivery fees and the final amount before transferring. Your order stays pending until payment is received and confirmed.</p></section><a className="pill-button dark" href="/">Back to the good things <span>↗</span></a></> : <form className="checkout-form page-form" onSubmit={placeOrder}><div className="checkout-field-row"><label>Your name<input name="name" required autoComplete="name" placeholder="Name" /></label><label>Email for your confirmation<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label></div><label>Delivery address<textarea name="address" required autoComplete="street-address" placeholder="Street, city, state" rows={4} /></label><div className="checkout-section-title"><h2>Payment</h2><span>Bank transfer</span></div><p className="pending-note">After placing your order, we’ll show the transfer account and include it in your confirmation email. Delivery fees and the final amount are confirmed separately.</p><button className="pill-button dark full" disabled={busy || cart.length === 0}>{busy ? "Placing your order…" : "Place order"}<span>↗</span></button><p className="checkout-terms">By placing your order, you agree that we can use these details to arrange delivery and send an order update.</p></form>}</section><aside className="checkout-aside"><p className="eyebrow">A GOOD CHOICE</p><h2>Your bag <span>({cart.reduce((sum, line) => sum + line.quantity, 0)})</span></h2>{cart.length === 0 ? <p className="aside-empty">{placed ? `Order ${orderNumber}` : "Your bag is waiting for a little something."}</p> : <div className="checkout-items">{cart.map(({ product, quantity }) => <div className="checkout-item" key={product.id}><div className={`cart-thumb ${product.color}`}>{(product.image.startsWith("/") || product.image.startsWith("https://")) ? <ProductImage src={product.image} alt={product.name} /> : product.image}<i>{quantity}</i></div><div><h3>{product.name}</h3><p>{product.category}</p></div><strong>{formatPrice(product.price_minor * quantity)}</strong></div>)}</div>}<div className="checkout-total"><span>Items subtotal</span><strong>{formatPrice(placed ? placedTotal : total)}</strong></div><p className="checkout-shipping">Delivery fees and any taxes will be confirmed before you transfer.</p><a className="back-link" href="/">← Keep looking around</a></aside></div></main>;
}
