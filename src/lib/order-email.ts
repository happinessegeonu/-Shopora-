import { bankTransfer } from "@/lib/payment";

type OrderEmail = {
  orderNumber: string;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  items: { name: string; quantity: number; line_total: number }[];
  email: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  location: string;
  address: string;
};

function money(minor: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: process.env.STORE_CURRENCY || "NGN", maximumFractionDigits: 0 }).format(minor / 100);
}

function mailbox(value: string | undefined) {
  const email = value?.trim();
  return email && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) ? email : undefined;
}

async function send(to: string, subject: string, text: string, replyTo?: string) {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN || !process.env.MAILGUN_FROM_EMAIL) return false;
  try {
    const message = new FormData();
    message.set("from", process.env.MAILGUN_FROM_EMAIL);
    message.set("to", to);
    message.set("subject", subject);
    message.set("text", text);
    if (replyTo) message.set("h:Reply-To", replyTo);
    const base = process.env.MAILGUN_REGION?.toUpperCase() === "EU" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
    const response = await fetch(`${base}/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64")}` },
      body: message,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) console.error("Order email provider rejected message", response.status);
    return response.ok;
  } catch { console.error("Order email could not be sent"); return false; }
}

export async function sendOrderEmails(order: OrderEmail) {
  const owner = mailbox(process.env.ORDER_NOTIFICATION_EMAIL);
  const replyTo = mailbox(process.env.ORDER_REPLY_TO_EMAIL) || owner;
  const lines = order.items.map((item) => `${item.name}\nQuantity: ${item.quantity} | Unit price: ${money(item.line_total / item.quantity)} | Line total: ${money(item.line_total)}`).join("\n\n");
  const totals = `Items subtotal: ${money(order.subtotalMinor)}\nShipping: ${money(order.shippingMinor)}\nOrder total: ${money(order.totalMinor)}`;
  const delivery = `Deliver to: ${order.receiverName}, ${order.receiverPhone}\nLocation: ${order.location}\nAddress: ${order.address}\nEstimated delivery: 3–4 days`;
  const account = `Bank: ${bankTransfer.bank}\nAccount number: ${bankTransfer.accountNumber}\nAccount name: ${bankTransfer.accountName}\nTransfer narration/reference: ${order.orderNumber}`;
  const customerText = `Hi ${order.senderName},\n\nThank you for shopping with Shopora. We’ve received your order ${order.orderNumber}.\n\n${lines}\n\n${totals}\nPayment status: awaiting bank transfer\n\n${delivery}\n\n${account}\n\nPlease transfer the order total above using your order number as the narration. Your order stays pending until payment is received and confirmed.\n\nShopora`;
  const ownerText = `New Shopora order: ${order.orderNumber}\n\nPayment status: awaiting bank transfer — not yet confirmed.\n\nCustomer: ${order.senderName}\nCustomer email: ${order.email}\nCustomer phone: ${order.senderPhone}\n\n${lines}\n\n${totals}\n\n${delivery}\n\n${account}\n\nCheck your bank account for the full order total and matching reference before confirming payment or sending the products. This order email is not proof of payment.\n\nReply to this email to contact the customer.`;
  const [emailSent, ownerEmailSent] = await Promise.all([
    send(order.email, `Shopora order received — ${order.orderNumber}`, customerText, replyTo),
    owner ? send(owner, `New Shopora order — ${order.orderNumber} — payment pending`, ownerText, order.email) : Promise.resolve(false),
  ]);
  return { emailSent, ownerEmailSent };
}
