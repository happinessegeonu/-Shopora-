-- Run in the Supabase SQL editor. Product prices are integer minor units (kobo for NGN).
create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  name text not null,
  description text not null default '',
  price_minor bigint not null check (price_minor >= 0),
  category text not null default 'Everything',
  image_url text,
  badge text,
  color text not null default 'sand',
  stock integer check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products alter column stock drop not null;
alter table public.products alter column stock drop default;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_id uuid references auth.users(id) on delete set null,
  email text not null,
  customer_name text not null,
  delivery_address text not null,
  currency text not null default 'NGN',
  total_minor bigint not null check (total_minor >= 0),
  status text not null default 'payment_pending' check (status in ('payment_pending','paid','processing','shipped','cancelled','refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  quantity integer not null check (quantity > 0),
  line_total bigint not null check (line_total >= 0)
);

create index if not exists orders_customer_id_created_at_idx on public.orders(customer_id, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products" on public.products for select using (active = true);
drop policy if exists "Customers can view own orders" on public.orders;
create policy "Customers can view own orders" on public.orders for select to authenticated using (auth.uid() = customer_id);
drop policy if exists "Customers can view own order items" on public.order_items;
create policy "Customers can view own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.customer_id = auth.uid()));

create or replace function public.create_store_order(p_email text, p_name text, p_address text, p_items jsonb, p_customer_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_total bigint := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_lines jsonb := '[]'::jsonb;
begin
  if p_customer_id is not null and p_customer_id <> auth.uid() then raise exception 'invalid customer'; end if;
  if length(trim(p_email)) not between 3 and 254 or length(trim(p_name)) not between 1 and 120 or length(trim(p_address)) not between 1 and 600 then raise exception 'invalid checkout details'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'invalid items'; end if;
  if (select count(*) <> count(distinct value->>'productId') from jsonb_array_elements(p_items)) then raise exception 'duplicate product'; end if;

  -- Lock all relevant products in a stable order before checking or decrementing stock.
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'productId' loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty not between 1 and 50 then raise exception 'invalid quantity'; end if;
    select * into v_product from public.products where id = v_item->>'productId' and active = true for update;
    if not found or (v_product.stock is not null and v_product.stock < v_qty) then raise exception 'stock unavailable'; end if;
    v_total := v_total + v_product.price_minor * v_qty;
  end loop;

  insert into public.orders(customer_id, email, customer_name, delivery_address, currency, total_minor)
  values (p_customer_id, lower(trim(p_email)), trim(p_name), trim(p_address), coalesce(nullif(current_setting('app.store_currency', true), ''), 'NGN'), v_total)
  returning id, order_number into v_order_id, v_order_number;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_product from public.products where id = v_item->>'productId' and active = true;
    update public.products set stock = stock - v_qty where id = v_product.id;
    insert into public.order_items(order_id, product_id, product_name, unit_price_minor, quantity, line_total)
    values (v_order_id, v_product.id, v_product.name, v_product.price_minor, v_qty, v_product.price_minor * v_qty);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('name', v_product.name, 'quantity', v_qty, 'line_total', v_product.price_minor * v_qty));
  end loop;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number, 'total_minor', v_total, 'items', v_lines);
end;
$$;

revoke all on function public.create_store_order(text,text,text,jsonb,uuid) from public;
grant execute on function public.create_store_order(text,text,text,jsonb,uuid) to anon, authenticated;

delete from public.products where id in ('linen-tote','ceramic-cup','body-oil','notebook','market-basket','incense-set','perfume-item');

insert into public.products(id,name,description,price_minor,category,image_url,color,stock) values
('wireless-mini-printer','Wireless Mini Printer','Good tech, ready for everyday life.',3800000,'Electronics','/products/Electronics/wireless_mini_printer.jpg','sand',null),
('tablet-16gb-512gb','Tablet 16GB / 512GB','Good tech, ready for everyday life.',22000000,'Electronics','/products/Electronics/tablet_16gb_512gb.jpg','clay',null),
('dell-inspiron-16gb-512gb','Dell Inspiron 16GB / 512GB','Good tech, ready for everyday life.',180000000,'Electronics','/products/Electronics/dell_inspiron_16gb_512gb.jpg','olive',null),
('dell-latitude-7490','Dell Latitude 7490 8GB / 256GB','Good tech, ready for everyday life.',30000000,'Electronics','/products/Electronics/dell_latitude_7490.jpg','lilac',null),
('cidea-tab','Cidea Tab 8GB / 256GB','Good tech, ready for everyday life.',17000000,'Electronics','/products/Electronics/cidea_tab.jpg','butter',null),
('airtab','Airtab 16GB / 256GB','Good tech, ready for everyday life.',16000000,'Electronics','/products/Electronics/airtab.jpg','rose',null),
('canon-eos-650','Canon EOS 650','Good tech, ready for everyday life.',50000000,'Electronics','/products/Electronics/canon_eos_650.jpg','sand',null),
('ipad-4gb-128gb','iPad 4GB / 128GB','Good tech, ready for everyday life.',65000000,'Electronics','/products/Electronics/ipad_4gb_128gb.jpg','clay',null),
('iphone-17-pro-max-256gb','iPhone 17 Pro Max 256GB','Good tech, ready for everyday life.',170000000,'Electronics','/products/Electronics/iphone_17_pro_max.jpg','olive',null),
('iphone-16-256gb','iPhone 16 256GB','Good tech, ready for everyday life.',110000000,'Electronics','/products/Electronics/iphone_16.jpg','lilac',null),
('logitech-wireless-mouse-250','Logitech Wireless Mouse 250','Good tech, ready for everyday life.',3000000,'Electronics','/products/Electronics/logitech_wireless_mouse_250.jpg','butter',null),
('logi-125','Logi 125','Good tech, ready for everyday life.',4500000,'Electronics','/products/Electronics/logi_125.jpg','rose',null),
('logitech-wireless-340','Logitech Wireless 340','Good tech, ready for everyday life.',3500000,'Electronics','/products/Electronics/logitech_wireless_340.jpg','sand',null),
('dell-latitude-5390','Dell Latitude 5390 8GB RAM / 256GB SSD','Good tech, ready for everyday life.',25000000,'Electronics','/products/Electronics/dell_latitude_5390.jpg','clay',null),
('lenovo-thinkpad-t480s','Lenovo ThinkPad T480s 16GB RAM / 256GB SSD','Good tech, ready for everyday life.',29000000,'Electronics','/products/Electronics/lenovo_thinkpad_t480s.jpg','olive',null),
('iphone-xr-64gb','iPhone XR 64GB','Good tech, ready for everyday life.',23000000,'Electronics','/products/Electronics/iphone_xr_64gb.jpg','lilac',null),
('google-pixel-10-pro-fold','Google Pixel 10 Pro Fold 12GB / 256GB','Good tech, ready for everyday life.',120000000,'Electronics','/products/Electronics/google_pixel_10_pro_fold.jpg','butter',null),
('selena','Selena','A new look, chosen just for you.',6000000,'Wigs','/products/Wigs/selena.jpg','rose',null),
('capri-wave','Capri Wave','A new look, chosen just for you.',7500000,'Wigs','/products/Wigs/capri_wave.jpg','sand',null),
('isla-wave','Isla Wave','A new look, chosen just for you.',7200000,'Wigs','/products/Wigs/isla_wave.jpg','clay',null),
('asad-bourbon','Asad Bourbon','A lovely find for your collection.',3500000,'Perfumes','/products/Perfumes/asad_bourbon.jpg','olive',null),
('overdose','Overdose','A lovely find for your collection.',7500000,'Perfumes','/products/Perfumes/overdose.jpg','lilac',null),
('undiluted-perfume-oils-50ml','Undiluted Perfume Oils — 50ml','A lovely find for your collection.',2000000,'Perfumes','/products/Perfumes/undiluted_perfume_oils.jpg','butter',null),
('undiluted-perfume-oils-100ml','Undiluted Perfume Oils — 100ml','A lovely find for your collection.',3500000,'Perfumes','/products/Perfumes/undiluted_perfume_oils.jpg','rose',null),
('qaed-al-fursan','Qaed Al Fursan','A lovely find for your collection.',2700000,'Perfumes','/products/Perfumes/qaed_al_fursan.jpg','sand',null),
('red-diamond','Red Diamond','A lovely find for your collection.',1050000,'Perfumes','/products/Perfumes/red_diamond.jpg','clay',null),
('matelot-100ml','Matelot 100ml','A lovely find for your collection.',1700000,'Perfumes','/products/Perfumes/matelot_100ml.jpg','olive',null),
('oud-al-layl','Oud Al Layl','A lovely find for your collection.',1800000,'Perfumes','/products/Perfumes/oud_al_layl.jpg','lilac',null),
('perfume-collection-blue','Perfume Collection — Blue','A lovely find for your collection.',1600000,'Perfumes','/products/Perfumes/perfume_collection_blue.jpg','butter',null),
('perfume-collection-pink','Perfume Collection — Pink','A lovely find for your collection.',2000000,'Perfumes','/products/Perfumes/perfume_collection_pink.jpg','rose',null),
('perfume-collection-multi','Perfume Collection — Multi','A lovely find for your collection.',1200000,'Perfumes','/products/Perfumes/perfume_collection_multi.jpg','sand',null),
('perfume-collection-boxed','Perfume Collection — Boxed','A lovely find for your collection.',850000,'Perfumes','/products/Perfumes/perfume_collection_boxed.jpg','clay',null),
('ameer-al-oud','Ameer Al Oud','A lovely find for your collection.',2800000,'Perfumes','/products/Perfumes/perfume_item_undetermined.jpg','olive',null)
on conflict (id) do update set name=excluded.name, description=excluded.description, price_minor=excluded.price_minor, category=excluded.category, image_url=excluded.image_url, color=excluded.color, stock=null, active=true;
