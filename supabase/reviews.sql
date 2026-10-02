-- Run once in the Supabase SQL editor to enable customer reviews.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  rating integer not null check (rating between 1 and 5),
  body text not null check (length(trim(body)) between 10 and 2000),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reviews_approved_created_at_idx on public.reviews (created_at desc) where approved = true;
alter table public.reviews enable row level security;
grant select on public.reviews to anon, authenticated;
grant insert (customer_id, display_name, rating, body) on public.reviews to authenticated;
drop policy if exists "Public can read approved reviews" on public.reviews;
create policy "Public can read approved reviews" on public.reviews for select to anon, authenticated using (approved = true);
drop policy if exists "Customers can submit reviews" on public.reviews;
create policy "Customers can submit reviews" on public.reviews for insert to authenticated with check (auth.uid() = customer_id and approved = false);
-- Approve submissions by setting approved = true in the Supabase table editor.
