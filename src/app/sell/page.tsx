"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/catalog";

import { SellerPayoutDetails } from "@/components/SellerPayoutDetails";
type Listing = { id: string; name: string; status: string; price_minor: number; image_url: string };
export default function SellPage() {
 const [userId, setUserId] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState("");
 const [listings, setListings] = useState<Listing[]>([]);
 const [preview, setPreview] = useState<string | null>(null);
 useEffect(() => {
  const client = createClient();
  if (!client) { setLoading(false); return; }
  void client.auth.getUser().then(async ({ data }) => {
   setUserId(data.user?.id ?? null);
   if (data.user) {
    const result = await client.from("seller_listings").select("id,name,status,price_minor,image_url").order("created_at", { ascending: false });
    if (result.data) setListings(result.data);
    if (result.error) setMessage("We couldn’t load your listings. Please try again shortly.");
   }
   setLoading(false);
  });
 }, []);
 useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
 async function submit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const client = createClient();
  if (!client || !userId || busy) return;
  const form = event.currentTarget;
  const values = new FormData(form);
  const file = values.get("photo") as File;
  const price = Number(values.get("price"));
  if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setMessage("Choose a JPG, PNG, or WebP photo smaller than 5 MB."); return; }
  if (!Number.isFinite(price) || price < 1 || price > 100000000) { setMessage("Enter a price between ₦1 and ₦100,000,000."); return; }
  setBusy(true); setMessage("");
  try {
   const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
   const path = `${userId}/${crypto.randomUUID()}.${extension}`;
   const upload = await client.storage.from("seller-products").upload(path, file, { contentType: file.type, upsert: false });
   if (upload.error) throw new Error("Your photo couldn’t be uploaded. Please try again shortly.");
   const { data } = client.storage.from("seller-products").getPublicUrl(path);
   const result = await client.from("seller_listings").insert({ seller_id:userId, store_name:String(values.get("store")).trim(), contact_phone:String(values.get("phone")).trim(), name:String(values.get("name")).trim(), description:String(values.get("description")).trim(), category:values.get("category"), price_minor:Math.round(price * 100), image_url:data.publicUrl }).select("id,name,status,price_minor,image_url").single();
   if (result.error) throw new Error("Your listing couldn’t be saved. Please try again shortly.");
   setListings(current => [result.data, ...current]); form.reset(); setPreview(null);
   setMessage("Product submitted! We’ll review it before it appears in the shop. Your listing is saved below.");
  } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
  finally { setBusy(false); }
 }
 return <main className="seller-page"><header className="header wrap"><a className="brand" href="/">shopora<span>✳</span></a><a className="text-link" href="/#shop">Back to shopping ↗</a></header>
  <section className="seller-intro wrap"><p className="eyebrow">YOUR PRODUCTS. A NEW AUDIENCE.</p><h1>Make room for<br /><em>your business.</em></h1><p>Whatever your business sells, there’s a place to start: foodstuffs, groceries, packaged food, fashion, beauty, electronics, home essentials, and handmade goods. Submit lawful products for review and grow one listing at a time.</p><p className="seller-help">Shopora charges 10% commission on completed product sales. You receive 90% of the product price. For a ₦20,000 sale, Shopora keeps ₦2,000 and you receive ₦18,000. Shipping is separate. Payouts are arranged manually after payment and delivery are confirmed. Fully refunded or cancelled orders earn no commission.</p><div className="seller-steps"><span><b>01</b> Add your product</span><span><b>02</b> We review your listing</span><span><b>03</b> Reach Shopora shoppers</span></div></section>
  <section className="seller-faq wrap" aria-label="Seller questions"><details><summary>Can I sell foodstuffs and groceries?</summary><p>Yes. Rice, beans, spices, packaged foods, and other lawful goods can be submitted using Other. Describe the pack size, storage, and expiry details. Every listing is reviewed; fresh or temperature-sensitive foods need delivery arrangements confirmed before approval.</p></details><details><summary>Do I need a big business to start?</summary><p>No. Start with one product, a clear photo, an accurate price, and your business contact details. Use your Shopora account to follow the review status.</p></details><details><summary>What will I earn from a sale?</summary><p>You receive 90% of the product price on completed sales. Shopora’s commission is 10%; shipping is separate. Payment and delivery must be confirmed before a manual payout is arranged.</p></details></section>
  <section className="seller-workspace wrap">{loading ? <p role="status">Loading your seller space…</p> : !userId ? <div className="seller-signin"><h2>Your seller space starts here.</h2><p>Sign in or create a Shopora account, and return to your seller space after signing in.</p><a className="pill-button dark" href="/?signin=1&next=%2Fsell">Sign in to start selling ↗</a></div> : <><div><SellerPayoutDetails key={userId} sellerId={userId} /><p className="eyebrow">CREATE A LISTING</p><h2>Show us your next good find.</h2><p className="seller-help">Listings are reviewed before publication. Shopora will contact you about fulfillment and payment arrangements before your first sale.</p>{message && <p className="seller-message" role="status">{message}</p>}<form className="seller-form" onSubmit={submit}><div className="seller-fields"><label>Store or business name<input name="store" required minLength={2} maxLength={80} placeholder="Your store name" /></label><label>Contact phone<input name="phone" type="tel" required minLength={7} maxLength={30} autoComplete="tel" placeholder="Phone or WhatsApp number" /></label></div><label>Product name<input name="name" required minLength={2} maxLength={120} placeholder="Give your product a clear name" /></label><div className="seller-fields"><label>Category<select name="category" required>{["Electronics","Wigs","Perfumes","Fashion","Home","Other"].map(item => <option key={item}>{item}</option>)}</select></label><label>Price (₦)<input name="price" type="number" min={1} max={100000000} step="0.01" required placeholder="0.00" /></label></div><div className="listing-guide"><h3>Make your listing easy to trust</h3><p>Include the exact quantity or pack size (for example, rice per 5 kg bag), condition, available stock, and your dispatch location. Use a photo of the actual product.</p><p><strong>Selling foodstuffs or groceries?</strong> Select Other and name the food type in your description. Include ingredients or allergens where relevant, expiry or best-before date, and storage requirements. Fresh, cooked, chilled, or frozen food needs a suitable delivery arrangement confirmed by Shopora before approval; standard delivery is 3–4 days.</p></div><label>Product description<textarea name="description" required minLength={10} maxLength={2000} rows={4} placeholder="What is included? State pack size, available quantity, dispatch location, and any storage or expiry details." /></label><label className="photo-upload">Product photo<span>One clear photo. JPG, PNG, or WebP, up to 5 MB. Your photo will be public.</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={e => { const file = e.target.files?.[0]; setPreview(file ? URL.createObjectURL(file) : null); }} />{preview && <img src={preview} alt="Your product preview" />}</label><p className="seller-help">Your contact number is kept with your submission and isn’t displayed publicly.</p><label><input type="checkbox" name="commissionAgreement" required /> I agree to the 10% commission on completed product sales, excluding shipping.</label><button className="pill-button dark" disabled={busy}>{busy ? "Submitting…" : "Submit for review"} <span>↗</span></button></form></div><aside className="seller-listings"><p className="eyebrow">YOUR SELLER SPACE</p><h2>Your products <span>({listings.length})</span></h2>{listings.length === 0 ? <p>Once you submit a product, you can follow its review status here.</p> : listings.map(item => <article key={item.id}><img src={item.image_url} alt={item.name} /><div><h3>{item.name}</h3><p>{formatPrice(item.price_minor)}</p><span className={`listing-status ${item.status}`}>{item.status === "pending" ? "Awaiting review" : item.status === "approved" ? "Approved" : "Not approved"}</span></div></article>)}</aside></>}</section>
 </main>;
}
