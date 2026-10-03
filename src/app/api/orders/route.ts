import { NextResponse } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { sendOrderEmails } from "@/lib/order-email";

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
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (authorization && !token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const supabase = token ? createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }) : createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values: Parameters<SetAllCookies>[0]) =>
        values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (token && (authError || !user)) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { data, error } = await supabase.rpc("create_store_order", { p_email: email, p_name: senderName, p_phone: senderPhone, p_receiver_name: receiverName, p_receiver_phone: receiverPhone, p_location: location, p_address: address, p_state: state, p_items: items, p_customer_id: user?.id ?? null });
  if (error) {
    console.error("Order creation failed", error.message);
    return NextResponse.json({ error: error.message.includes("shipping") ? "Delivery is unavailable for the selected state. Please choose a supported delivery location." : error.message.includes("stock") ? "One of these items is no longer available in that quantity." : "We couldn’t place your order. Please try again." }, { status: 400 });
  }

  let cartCleared = true;
  if (user) {
    const { error: cartError } = await supabase.rpc("consume_my_cart", { p_items: items });
    cartCleared = !cartError;
    if (cartError) console.error("Order saved but cart cleanup failed");
  }
  const { emailSent, ownerEmailSent } = await sendOrderEmails({
    orderNumber: data.order_number,
    subtotalMinor: data.subtotal_minor,
    shippingMinor: data.shipping_minor,
    totalMinor: data.total_minor,
    items: data.items,
    email, senderName, senderPhone, receiverName, receiverPhone, location, address,
  });
  return NextResponse.json({ orderNumber: data.order_number, emailSent, ownerEmailSent, cartCleared, subtotalMinor: data.subtotal_minor, shippingMinor: data.shipping_minor, totalMinor: data.total_minor }, { status: 201 });
}
