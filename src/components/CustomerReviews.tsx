"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Review = { id: string; display_name: string; rating: number; body: string };

export function CustomerReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const client = createClient();
    if (!client) { setLoadError(true); return; }
    void client.from("reviews").select("id,display_name,rating,body").eq("approved", true).order("created_at", { ascending: false }).limit(12).then(({ data, error }) => {
      if (error) setLoadError(true);
      else setReviews(data ?? []);
    });
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get("name") ?? "").trim();
    const body = String(values.get("body") ?? "").trim();
    if (!name || body.length < 10) { setMessage("Please add your name and at least 10 characters about your experience."); return; }
    setBusy(true); setMessage("");
    try {
      const client = createClient();
      if (!client) throw new Error("Reviews are temporarily unavailable. Please try again later.");
      const { data, error: authError } = await client.auth.getUser();
      if (authError || !data.user) { setMessage("Please sign in using the account button above, then submit your review."); return; }
      const { error } = await client.from("reviews").insert({ customer_id: data.user.id, display_name: name, rating, body });
      if (error) throw new Error("We couldn’t save your review. Please try again later.");
      form.reset(); setRating(5);
      setMessage("Thank you! Your review has been submitted and will appear once approved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn’t save your review. Please try again.");
    } finally { setBusy(false); }
  }

  return <section className="reviews-section wrap" id="reviews" aria-labelledby="reviews-title">
    <div className="section-heading"><div><p className="eyebrow">FROM OUR CUSTOMERS</p><h2 id="reviews-title">Share your <em>good finds.</em></h2><p>How was your Shopora experience? We’d love to hear it.</p></div></div>
    <div className="reviews-layout">
      <div className="review-list">{reviews.length ? reviews.map((review) => <article className="review-card" key={review.id}><span className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><p>{review.body}</p><strong>{review.display_name}</strong></article>) : <p className="reviews-empty">{loadError ? "Customer reviews are temporarily unavailable." : "Be the first to share your Shopora experience."}</p>}</div>
      <form className="review-form" onSubmit={submit}>
        <h3>Leave a review</h3><p>Sign in to share your experience. Reviews appear after approval.</p>
        <label htmlFor="review-name">Your public name</label><input id="review-name" name="name" required maxLength={80} autoComplete="nickname" placeholder="Name shown with your review" />
        <fieldset><legend>Your rating</legend><div className="rating-options">{[1, 2, 3, 4, 5].map((value) => <label key={value}><input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} /><span>{value} ★</span></label>)}</div></fieldset>
        <label htmlFor="review-body">Your review</label><textarea id="review-body" name="body" required minLength={10} maxLength={2000} rows={5} placeholder="Tell us about your purchase, delivery, or shopping experience…" />
        <p className="review-privacy">Your name and review will be public. Please leave out phone numbers, addresses, and order details.</p>
        <button className="pill-button dark" disabled={busy}>{busy ? "Submitting…" : "Submit review"}<span>↗</span></button>
        {message && <p role="status" className="review-feedback">{message}</p>}
      </form>
    </div>
  </section>;
}
