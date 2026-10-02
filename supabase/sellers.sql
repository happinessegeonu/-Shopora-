-- Run once in the Shopora Supabase SQL editor.
create table if not exists public.seller_listings (
 id uuid primary key default gen_random_uuid(),
 seller_id uuid not null references auth.users(id),
 store_name text not null check (length(trim(store_name)) between 2 and 80),
 contact_phone text not null check (length(contact_phone) between 7 and 30),
 name text not null check (length(trim(name)) between 2 and 120),
 description text not null check (length(trim(description)) between 10 and 2000),
 category text not null check (category in ('Electronics','Wigs','Perfumes','Fashion','Home','Other')),
 price_minor bigint not null check (price_minor between 100 and 10000000000),
 image_url text not null check (image_url like 'https://sjslqydjwxbpkxfnvvrv.supabase.co/storage/v1/object/public/seller-products/%'),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
alter table public.seller_listings enable row level security;
create policy "Sellers view own submissions" on public.seller_listings for select to authenticated using (seller_id = auth.uid());
create policy "Sellers submit for review" on public.seller_listings for insert to authenticated with check (seller_id = auth.uid() and status = 'pending' and image_url like 'https://sjslqydjwxbpkxfnvvrv.supabase.co/storage/v1/object/public/seller-products/' || auth.uid()::text || '/%');
grant select, insert on public.seller_listings to authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seller-products','seller-products',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy "Sellers upload own product photos" on storage.objects for insert to authenticated with check (bucket_id = 'seller-products' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Product photos are public" on storage.objects for select using (bucket_id = 'seller-products');
-- Review a submission in the Table Editor. To approve, run in one transaction:
-- begin;
-- insert into public.products (id,name,description,price_minor,category,image_url,color,active)
-- select 'seller-' || id::text,name,description,price_minor,category,image_url,'sand',true
-- from public.seller_listings where id = 'SUBMISSION_UUID' and status = 'pending';
-- update public.seller_listings set status = 'approved' where id = 'SUBMISSION_UUID' and status = 'pending';
-- commit;
