"use client";
import { useRef, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { useRuntime } from "@/components/RuntimeNotice";
import { formatPrice } from "@/lib/catalog";
import { bankTransfer } from "@/lib/payment";
import { useShippingRates } from "@/lib/shipping";
import { useCart } from "@/lib/use-cart";
type Receipt = { orderNumber: string; subtotalMinor: number; shippingMinor: number; totalMinor: number; emailSent: boolean; cartCleared: boolean; simulated: boolean; replayed: boolean };
export default function CheckoutPage() {
  const { preview } = useRuntime();
  const { cart, cartError, cartReady, syncStatus, clearPurchased } = useCart();
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[receipt,setReceipt]=useState<Receipt|null>(null),[deliveryState,setDeliveryState]=useState("");
  const [sameReceiver,setSameReceiver]=useState(false);
  const lock=useRef(false), attempt=useRef<{body:string;key:string}|null>(null);
  const shipping=useShippingRates();
  const total=cart.reduce((sum,line)=>sum+line.product.price_minor*line.quantity,0);
  const rate=shipping.rates.find(item=>item.state===deliveryState);
  async function placeOrder(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(lock.current)return;
    if(!cartReady||!cart.length||!rate){setNotice("Wait for your bag and select a delivery state before ordering.");return;}
    const data=new FormData(event.currentTarget),senderName=data.get("senderName"),senderPhone=data.get("senderPhone");
    const body=JSON.stringify({senderName,senderPhone,email:data.get("email"),receiverName:sameReceiver?senderName:data.get("receiverName"),receiverPhone:sameReceiver?senderPhone:data.get("receiverPhone"),location:data.get("location"),state:data.get("state"),address:data.get("address"),items:cart.map(line=>({productId:line.product.id,quantity:line.quantity}))});
    if(attempt.current?.body!==body)attempt.current={body,key:crypto.randomUUID()};
    lock.current=true;setBusy(true);setNotice("");
    try{
      const response=await fetch("/api/orders",{method:"POST",headers:{"content-type":"application/json","idempotency-key":attempt.current.key},body});
      const result=await response.json().catch(()=>null);
      if(!response.ok||!result)throw new Error(result?.error||"Could not confirm checkout. Retry without changing the order, or check Your orders first.");
      setReceipt(result);await clearPurchased(cart,result.cartCleared);
      setNotice(result.simulated?`Test order ${result.orderNumber} saved. No payment was taken. See the simulated test inbox.`:result.replayed?`Order ${result.orderNumber} was already received. Keep this reference.`:result.emailSent?`Order ${result.orderNumber} received. A confirmation is on its way.`:`Order ${result.orderNumber} received. The confirmation email could not be sent yet. Keep this reference.`);
    }catch(error){setNotice(error instanceof TypeError?"Connection interrupted. Retry without changing the order, or check Your orders first.":error instanceof Error?error.message:"Please try again.");}
    finally{lock.current=false;setBusy(false);}
  }
  const subtotal=receipt?.subtotalMinor??total;
  const shippingFee=receipt?.shippingMinor??rate?.fee_minor;
  return <main className="checkout-page">
    <header className="checkout-header wrap"><a className="brand" href="/">shopora<span>✳</span></a><a className="back-link checkout-back" href="/#shop">← Back to shopping</a></header>
    <div className="checkout-layout wrap"><section className="checkout-main"><p className="eyebrow">THE LAST LITTLE STEP</p><h1>Almost <em>yours.</em></h1><p role="status">{cartError||syncStatus}</p>
      {notice&&<div className={receipt?"order-notice success":"order-notice"} role={receipt?"status":"alert"}>{notice}</div>}
      {receipt?<>
        <section className="bank-transfer"><h2>{receipt.simulated?"Simulated payment":"Payment instructions"}</h2>
          {receipt.simulated?<><p>No payment was taken. Do not transfer money.</p><p>Test total: {formatPrice(receipt.totalMinor)}</p><a href="/preview">Open simulated test inbox</a></>:<><dl><div><dt>Total to transfer</dt><dd>{formatPrice(receipt.totalMinor)}</dd></div><div><dt>Bank</dt><dd>{bankTransfer.bank}</dd></div><div><dt>Account name</dt><dd>{bankTransfer.accountName}</dd></div><div><dt>Account number</dt><dd>{bankTransfer.accountNumber}</dd></div></dl><p>Use <strong>{receipt.orderNumber}</strong> as the transfer narration. Your order stays pending until payment is confirmed.</p></>}
        </section><p><a href="/orders">Your orders</a></p><a className="pill-button dark" href="/">Back to the shop ↗</a>
      </>:<form className="checkout-form page-form" onSubmit={placeOrder}>
        <div className="checkout-section-title"><h2>Sender details</h2><span>Your contact information</span></div>
        <div className="checkout-field-row"><label>Sender’s full name<input name="senderName" required maxLength={120} autoComplete="name"/></label><label>Sender’s phone<input name="senderPhone" type="tel" required minLength={7} maxLength={30} autoComplete="tel"/></label></div>
        <label>Email for order updates<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>
        <div className="checkout-section-title"><h2>Delivery details</h2></div>
        <label style={{display:"flex",alignItems:"center",gap:10}}><input style={{width:"auto"}} type="checkbox" checked={sameReceiver} onChange={event=>setSameReceiver(event.target.checked)}/>I’m receiving this order</label>
        {!sameReceiver&&<div className="checkout-field-row"><label>Receiver’s full name<input name="receiverName" required maxLength={120} autoComplete="shipping name"/></label><label>Receiver’s phone<input name="receiverPhone" type="tel" required minLength={7} maxLength={30} autoComplete="shipping tel"/></label></div>}
        <div className="checkout-field-row"><label>City or town<input name="location" required maxLength={80} autoComplete="address-level2"/></label><label>Delivery state<select name="state" required autoComplete="shipping address-level1" value={deliveryState} onChange={event=>setDeliveryState(event.target.value)} disabled={shipping.loading||!shipping.rates.length}><option value="">{shipping.loading?"Loading delivery options…":"Select your state"}</option>{shipping.rates.map(item=><option key={item.state} value={item.state}>{item.state}</option>)}</select></label></div>
        <label>Delivery street address<textarea name="address" required maxLength={600} autoComplete="street-address" rows={3}/></label>
        {shipping.error&&<p role="alert" className="shipping-error">{shipping.error}</p>}
        <div className="checkout-section-title"><h2>Payment</h2><span>{preview?"Simulated payment":"Bank transfer"}</span></div>
        <p className="pending-note">{preview?"Test only. No payment is taken, no delivery is arranged, and confirmation goes to the simulated inbox.":"After placing your order we will show transfer instructions and send the order details by email."}</p>
        <button className="pill-button dark full" disabled={busy||!cartReady||!cart.length||!rate}>{busy?"Placing your order…":"Place order"}<span>↗</span></button>
      </form>}
    </section><aside className="checkout-aside"><p className="eyebrow">A GOOD CHOICE</p><h2>Your bag <span>({cart.reduce((sum,line)=>sum+line.quantity,0)})</span></h2>{!cart.length?<p>{receipt?`Order ${receipt.orderNumber}`:"Your bag is empty."}</p>:<div className="checkout-items">{cart.map(({product,quantity})=><div key={product.id} className="checkout-item"><div className={`cart-thumb ${product.color}`}>{product.image.startsWith("/")||product.image.startsWith("https://")?<ProductImage src={product.image} alt={product.name}/>:product.image}<i>{quantity}</i></div><div><h3>{product.name}</h3><p>{product.category}</p></div><strong>{formatPrice(product.price_minor*quantity)}</strong></div>)}</div>}
      <div className="checkout-total"><span>Items subtotal</span><strong>{formatPrice(subtotal)}</strong></div><div className="checkout-total"><span>Shipping</span><strong>{shippingFee===undefined?"Select delivery state":formatPrice(shippingFee)}</strong></div><div className="checkout-total" aria-live="polite"><span>Order total</span><strong>{shippingFee===undefined?"Awaiting delivery state":formatPrice(receipt?.totalMinor??subtotal+shippingFee)}</strong></div>
    </aside></div>
  </main>;
}
