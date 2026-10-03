-- Apply once. Only future seller sales accrue commission; shipping is excluded.
begin;
create table if not exists public.seller_commissions (
  order_item_id uuid primary key references public.order_items(id),
  seller_id uuid not null references auth.users(id),
  store_name text not null,
  sale_minor bigint not null check (sale_minor >= 0),
  commission_bps integer not null default 1000 check (commission_bps = 1000),
  commission_minor bigint not null check (commission_minor >= 0),
  seller_share_minor bigint not null check (seller_share_minor >= 0),
  delivery_confirmed_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  check (commission_minor + seller_share_minor = sale_minor)
);
alter table public.seller_commissions enable row level security;
revoke all on public.seller_commissions from anon, authenticated;
grant all on public.seller_commissions to service_role;

create or replace function public.record_seller_commission()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare listing public.seller_listings%rowtype; fee bigint;
begin
  select * into listing from public.seller_listings
    where 'seller-' || id::text = new.product_id and status = 'approved';
  if found then
    fee := round(new.line_total::numeric / 10)::bigint;
    insert into public.seller_commissions
      (order_item_id,seller_id,store_name,sale_minor,commission_minor,seller_share_minor)
    values (new.id,listing.seller_id,listing.store_name,new.line_total,fee,new.line_total-fee);
  end if;
  return new;
end; $$;
revoke all on function public.record_seller_commission() from public,anon,authenticated;
drop trigger if exists record_seller_commission on public.order_items;
create trigger record_seller_commission after insert on public.order_items
for each row execute function public.record_seller_commission();

-- Private owner report. Refunded/cancelled orders accrue no current commission.
create or replace view public.seller_commission_report as
select c.*,o.order_number,o.status as order_status,i.product_name,i.quantity,
  case when o.status in ('cancelled','refunded') then 0 else c.commission_minor end as effective_commission_minor,
  case when o.status in ('paid','processing','shipped') and c.delivery_confirmed_at is not null
    and c.settled_at is null then c.seller_share_minor else 0 end as payable_minor
from public.seller_commissions c
join public.order_items i on i.id=c.order_item_id
join public.orders o on o.id=i.order_id;
revoke all on public.seller_commission_report from public,anon,authenticated;
grant select on public.seller_commission_report to service_role;
commit;
