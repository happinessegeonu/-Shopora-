-- Apply before deploying checkout. Owner-approved shipping is NGN 5,000 per order.
begin;
create table if not exists public.shipping_rates (
  state text primary key check (length(trim(state)) between 1 and 80 and state = trim(state)),
  fee_minor bigint not null check (fee_minor between 0 and 100000000),
  active boolean not null default true
);
create unique index if not exists shipping_rates_state_normalized_idx on public.shipping_rates (lower(state));
alter table public.shipping_rates enable row level security;
grant select on public.shipping_rates to anon, authenticated;
drop policy if exists "Anyone can view active shipping rates" on public.shipping_rates;
create policy "Anyone can view active shipping rates" on public.shipping_rates for select to anon, authenticated using (active = true);

insert into public.shipping_rates (state,fee_minor,active)
select state,500000,true from unnest(array[
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Federal Capital Territory (Abuja)',
  'Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara',
  'Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers',
  'Sokoto','Taraba','Yobe','Zamfara'
]) as state
on conflict (state) do update set fee_minor=excluded.fee_minor,active=excluded.active;

alter table public.orders add column if not exists shipping_minor bigint not null default 0 check (shipping_minor >= 0);
alter table public.orders add column if not exists delivery_state text;

-- Keep the current checkout running during deployment. Retire legacy procedures
-- with shipping-retire-legacy.sql after the new checkout is live.
create or replace function public.create_store_order(
  p_email text, p_name text, p_phone text, p_receiver_name text,
  p_receiver_phone text, p_location text, p_address text, p_state text,
  p_items jsonb, p_customer_id uuid default null
)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_order_id uuid; v_order_number text; v_subtotal bigint:=0;
  v_shipping bigint; v_state text; v_item jsonb;
  v_product public.products%rowtype; v_qty integer; v_lines jsonb:='[]'::jsonb;
begin
  if p_customer_id is not null and p_customer_id is distinct from auth.uid() then raise exception 'invalid customer'; end if;
  if length(trim(coalesce(p_email,''))) not between 3 and 254
    or length(trim(coalesce(p_name,''))) not between 1 and 120
    or length(trim(coalesce(p_phone,''))) not between 7 and 30
    or length(trim(coalesce(p_receiver_name,''))) not between 1 and 120
    or length(trim(coalesce(p_receiver_phone,''))) not between 7 and 30
    or length(trim(coalesce(p_location,''))) not between 1 and 120
    or length(trim(coalesce(p_address,''))) not between 1 and 600
    then raise exception 'invalid checkout details'; end if;
  select state,fee_minor into v_state,v_shipping from public.shipping_rates
    where lower(state)=lower(trim(p_state)) and active=true for share;
  if not found then raise exception 'shipping unavailable'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'invalid items'; end if;
  if jsonb_array_length(p_items) not between 1 and 30 then raise exception 'invalid items'; end if;
  if (select count(*)<>count(distinct value->>'productId') from jsonb_array_elements(p_items)) then raise exception 'duplicate product'; end if;
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'productId' loop
    v_qty:=(v_item->>'quantity')::integer;
    if v_qty is null or v_qty not between 1 and 50 then raise exception 'invalid quantity'; end if;
    select * into v_product from public.products where id=v_item->>'productId' and active=true for update;
    if not found or (v_product.stock is not null and v_product.stock<v_qty) then raise exception 'stock unavailable'; end if;
    v_subtotal:=v_subtotal+v_product.price_minor*v_qty;
  end loop;
  insert into public.orders(customer_id,email,customer_name,delivery_address,currency,total_minor,
    sender_phone,receiver_name,receiver_phone,delivery_location,delivery_state,shipping_minor)
  values(p_customer_id,lower(trim(p_email)),trim(p_name),trim(p_address),'NGN',v_subtotal+v_shipping,
    trim(p_phone),trim(p_receiver_name),trim(p_receiver_phone),trim(p_location),v_state,v_shipping)
  returning id,order_number into v_order_id,v_order_number;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty:=(v_item->>'quantity')::integer;
    select * into v_product from public.products where id=v_item->>'productId' and active=true;
    update public.products set stock=stock-v_qty where id=v_product.id;
    insert into public.order_items(order_id,product_id,product_name,unit_price_minor,quantity,line_total)
      values(v_order_id,v_product.id,v_product.name,v_product.price_minor,v_qty,v_product.price_minor*v_qty);
    v_lines:=v_lines||jsonb_build_array(jsonb_build_object('name',v_product.name,'quantity',v_qty,'line_total',v_product.price_minor*v_qty));
  end loop;
  return jsonb_build_object('order_id',v_order_id,'order_number',v_order_number,
    'subtotal_minor',v_subtotal,'shipping_minor',v_shipping,'total_minor',v_subtotal+v_shipping,'items',v_lines);
end; $$;
revoke all on function public.create_store_order(text,text,text,text,text,text,text,text,jsonb,uuid) from public;
grant execute on function public.create_store_order(text,text,text,text,text,text,text,text,jsonb,uuid) to anon,authenticated;
commit;
