"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { jsonRequest, watchUser } from "@/lib/store-client";
import { formatPrice } from "@/lib/catalog";
type Order = { order_number: string; created_at: string; status: string; total_minor: number; shipping_minor: number; items: { name: string; quantity: number; line_total: number }[] };
export default function OrdersPage() {
 const [orders,setOrders]=useState<Order[]>([]),[loading,setLoading]=useState(true),[signedIn,setSignedIn]=useState(false),[error,setError]=useState("");
 useEffect(()=>{let alive=true,version=0;const stop=watchUser(user=>{
  const current=++version;setOrders([]);setSignedIn(Boolean(user));setError("");
  if(!user){setLoading(false);return;}
  setLoading(true);void jsonRequest<{data:Order[]}>("/api/orders").then(result=>{if(alive&&current===version)setOrders(result.data);}).catch(()=>{if(alive&&current===version)setError("Could not load your orders. Refresh to try again.");}).finally(()=>{if(alive&&current===version)setLoading(false);});
 },()=>{setLoading(false);setError("Could not check your session. Please reconnect and refresh.");});return()=>{alive=false;stop();};},[]);
 return <main className="wrap" style={{maxWidth:900,padding:"36px 20px"}}><Link className="brand" href="/">shopora ✳</Link><h1>Your orders.</h1><p><Link href="/account">Your account</Link> · <Link href="/sell">Seller space</Link> · <Link href="/#shop">Keep shopping</Link></p>{error&&<p role="alert">{error}</p>}{loading?<p role="status">Loading your orders…</p>:!signedIn?<p>Sign in to see your orders. <Link href="/account">Sign in</Link></p>:orders.length===0?<p>You have no orders yet.</p>:<><p>Your 50 most recent orders. Payment stays pending until Shopora confirms receipt.</p>{orders.map(order=><article key={order.order_number} style={{border:"1px solid #d9d7cf",padding:20,borderRadius:16,marginBottom:20}}><h2>{order.order_number}</h2><p>{new Date(order.created_at).toLocaleDateString()} · {order.status.replaceAll("_"," ")}</p><ul>{order.items.map((item,index)=><li key={index}>{item.name} × {item.quantity} — {formatPrice(Number(item.line_total))}</li>)}</ul><p>Shipping: {formatPrice(order.shipping_minor)}</p><strong>Total: {formatPrice(order.total_minor)}</strong></article>)}</>}</main>;
}
