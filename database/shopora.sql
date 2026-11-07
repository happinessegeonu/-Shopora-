-- Run after owned-auth.sql, against the NEW database only.
-- No Supabase-specific roles, auth functions, storage buckets or Realtime services.
create table if not exists shopora_products (
 id text primary key, name text not null, description text not null default '',
 price_minor bigint not null check(price_minor between 0 and 10000000000),
 category text not null default 'Other', image_url text, badge text, color text not null default 'sand',
 stock integer check(stock>=0), active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists shopora_shipping_rates (
 state text primary key, fee_minor bigint not null check(fee_minor between 0 and 100000000), active boolean not null default true
);
create unique index if not exists shopora_shipping_state_idx on shopora_shipping_rates(lower(state));
create table if not exists shopora_cart_items (
 user_id uuid not null references shopora_auth.users(id) on delete cascade,
 product_id text not null references shopora_products(id),
 quantity integer not null default 0 check(quantity between 0 and 50), updated_at timestamptz not null default now(),
 primary key(user_id,product_id)
);
create table if not exists shopora_orders (
 id uuid primary key default gen_random_uuid(),
 order_number text not null unique default ('SH-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
 customer_id uuid references shopora_auth.users(id) on delete set null,
 email text not null, customer_name text not null, customer_phone text not null,
 receiver_name text not null, receiver_phone text not null, delivery_location text not null,
 delivery_state text not null, delivery_address text not null,
 currency text not null default 'NGN', subtotal_minor bigint not null check(subtotal_minor>=0),
 shipping_minor bigint not null check(shipping_minor>=0), total_minor bigint not null check(total_minor=subtotal_minor+shipping_minor),
 status text not null default 'payment_pending' check(status in ('payment_pending','paid','processing','shipped','cancelled','refunded')),
 created_at timestamptz not null default now()
);
create index if not exists shopora_orders_customer_idx on shopora_orders(customer_id,created_at desc);
create table if not exists shopora_order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references shopora_orders(id) on delete cascade,
 product_id text references shopora_products(id), product_name text not null,
 unit_price_minor bigint not null check(unit_price_minor>=0), quantity integer not null check(quantity between 1 and 50),
 line_total bigint not null check(line_total=unit_price_minor*quantity)
);
create table if not exists shopora_reviews (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references shopora_auth.users(id),
 display_name text not null check(length(trim(display_name)) between 1 and 80),
 rating integer not null check(rating between 1 and 5), body text not null check(length(trim(body)) between 10 and 2000),
 approved boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists shopora_media (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references shopora_auth.users(id),
 content_type text not null check(content_type in ('image/jpeg','image/png','image/webp')),
 data bytea not null check(octet_length(data) between 1 and 5242880), created_at timestamptz not null default now()
);
create table if not exists shopora_seller_listings (
 id uuid primary key default gen_random_uuid(), seller_id uuid not null references shopora_auth.users(id),
 store_name text not null check(length(trim(store_name)) between 2 and 80),
 contact_phone text not null check(length(contact_phone) between 7 and 30),
 name text not null check(length(trim(name)) between 2 and 120), description text not null check(length(trim(description)) between 10 and 2000),
 category text not null check(category in ('Electronics','Wigs','Perfumes','Fashion','Home','Other')),
 price_minor bigint not null check(price_minor between 100 and 10000000000), image_url text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')), created_at timestamptz not null default now()
);
create index if not exists shopora_seller_listings_owner_idx on shopora_seller_listings(seller_id,created_at desc);
create table if not exists shopora_seller_payout_accounts (
 seller_id uuid primary key references shopora_auth.users(id) on delete cascade,
 bank_name text not null check(length(trim(bank_name)) between 2 and 100),
 account_name text not null check(length(trim(account_name)) between 2 and 120),
 account_number text not null check(account_number ~ '^[0-9]{10}$')
);
create table if not exists shopora_seller_commissions (
 order_item_id uuid primary key references shopora_order_items(id), seller_id uuid not null references shopora_auth.users(id),
 store_name text not null, sale_minor bigint not null check(sale_minor>=0), commission_bps integer not null default 1000 check(commission_bps=1000),
 commission_minor bigint not null check(commission_minor>=0), seller_share_minor bigint not null check(seller_share_minor>=0),
 delivery_confirmed_at timestamptz, settled_at timestamptz, created_at timestamptz not null default now(),
 check(commission_minor+seller_share_minor=sale_minor)
);
-- PostgreSQL is accessible only through server credentials, never the browser.
-- Do not install a public PostgREST gateway or grant these tables to public roles.
revoke all on shopora_products,shopora_shipping_rates,shopora_cart_items,shopora_orders,shopora_order_items,
 shopora_reviews,shopora_media,shopora_seller_listings,shopora_seller_payout_accounts,shopora_seller_commissions from public;
