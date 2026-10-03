import { NextResponse } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import { bankTransfer } from "@/lib/payment";

type Item = { productId: string; quantity: number };

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Store checkout is not configured yet." }, { status: 503 });
  let body: { email?: string; senderName?: string; senderPhone?: string; receiverName?: string; receiverPhone?: string; location?: string; state?: string; address?: string; items?: Item[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Please check your checkout details." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 254) : "";
  const senderName = typeof body.senderName === "string" ? body.senderName.trim().slice(0, 120) : "";
  const senderPhone = typeof body.senderPhone === "string" ? body.senderPhone.trim().slice(0, 30) : "";
  const receiverName = typeof body.receiverName === "string" ? body.receiverName.trim().slice(0, 120) : "";
  const receiverPhone = typeof body.receiverPhone === "string" ? body.receiverPhone.trim().slice(0, 30) : "";
  const state = typeof body.state === "string" ? body.state.trim().slice(0, 80) : "";
  const city = typeof body.location === "string" ? body.location.trim().slice(0, 80) : "";
  const location = `${city}, ${state}`.slice(0, 120);
  const address = typeof body.address === "string" ? body.address.trim().slice(0, 600) : "";
  const items = Array.isArray(body.items) ? body.items : [];
  if (!/^\S+@\S+\.\S+$/.test(email) || !senderName || senderPhone.length < 7 || !receiverName || receiverPhone.length < 7 || !state || !city || !address || items.length < 1 || items.length > 30 || items.some((i) => !i || typeof i.productId !== "string" || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 50)) {
    return NextResponse.json({ error: "Please enter valid contact, delivery, and item details." }, { status: 400 });
  }
  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values: Parameters<SetAllCookies>[0]) =>
        values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc("create_store_order", { p_email: email, p_name: senderName, p_phone: senderPhone, p_receiver_name: receiverName, p_receiver_phone: receiverPhone, p_location: location, p_address: address, p_state: state, p_items: items, p_customer_id: user?.id ?? null });
  if (error) {
    console.error("Order creation failed", error.message);
    return NextResponse.json({ error: error.message.includes("shipping") ? "Delivery is unavailable for the selected state. Please choose a supported delivery location." : error.message.includes("stock") ? "One of these items is no longer available in that quantity." : "We couldn’t place your order. Please try again." }, { status: 400 });
  }

  let emailSent = false;
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN && process.env.MAILGUN_FROM_EMAIL) {
    try {
      const message = new FormData();
      message.set("from", process.env.MAILGUN_FROM_EMAIL);
      message.set("to", email);
      message.set("subject", `Shopora order received — ${data.order_number}`);
      message.set("text", `Hi ${senderName},\n\nThank you for shopping with Shopora. We’ve received your order ${data.order_number}.\n\n${data.items.map((i: { name: string; quantity: number; line_total: number }) => `${i.name} × ${i.quantity}: ${formatMoney(i.line_total)}`).join("\n")}\n\nItems subtotal: ${formatMoney(data.subtotal_minor)}\nShipping: ${formatMoney(data.shipping_minor)}\nOrder total: ${formatMoney(data.total_minor)}\nPayment status: awaiting bank transfer\n\nDeliver to: ${receiverName}, ${receiverPhone}\nLocation: ${location}\nAddress: ${address}\nEstimated delivery: 3–4 days\n\nBank: ${bankTransfer.bank}\nAccount number: ${bankTransfer.accountNumber}\nAccount name: ${bankTransfer.accountName}\nTransfer narration/reference: ${data.order_number}\n\nPlease transfer the order total above using your order number as the narration. Your order stays pending until payment is received and confirmed.\n\nShopora`);
      const mailgunApiBase = process.env.MAILGUN_REGION?.toUpperCase() === "EU"
        ? "https://api.eu.mailgun.net"
        : "https://api.mailgun.net";
      const response = await fetch(`${mailgunApiBase}/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64")}` },
        body: message,
      });
      emailSent = response.ok;
      if (!response.ok) console.error("Mailgun rejected order confirmation", response.status);
    } catch (error) { console.error("Mailgun order confirmation failed", error); }
  }
  return NextResponse.json({ orderNumber: data.order_number, emailSent, subtotalMinor: data.subtotal_minor, shippingMinor: data.shipping_minor, totalMinor: data.total_minor }, { status: 201 });
}

function formatMoney(minor: number) {
  const currency = process.env.STORE_CURRENCY || "NGN";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}
