-- Shared website/mobile cart. Prices remain authoritative at checkout.
begin;
create table if not exists public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity between 0 and 50),
  updated_at timestamptz not null default now(),
  primary key(user_id,product_id)
);
alter table public.cart_items enable row level security;
drop policy if exists "Users read own cart" on public.cart_items;
create policy "Users read own cart" on public.cart_items for select to authenticated using(user_id=auth.uid());
grant select on public.cart_items to authenticated;
revoke insert,update,delete on public.cart_items from anon,authenticated;

create or replace function public.change_cart_item(p_product_id text,p_delta integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare customer uuid:=auth.uid(); amount integer;
begin
  if customer is null then raise exception 'Sign in to sync your cart'; end if;
  if p_delta is null or p_delta not between -50 and 50 then raise exception 'Invalid quantity'; end if;
  perform pg_advisory_xact_lock(hashtextextended(customer::text,0));
  if p_delta>0 and not exists(select 1 from public.products where id=p_product_id and active) then raise exception 'Product unavailable'; end if;
  select quantity into amount from public.cart_items where user_id=customer and product_id=p_product_id;
  if coalesce(amount,0)=0 and p_delta>0 and (select count(*) from public.cart_items where user_id=customer and quantity>0)>=30 then
    raise exception 'Maximum cart size is 30 products';
  end if;
  amount:=coalesce(amount,0)+p_delta;
  if amount>50 then raise exception 'Maximum quantity is 50'; end if;
  -- Keep zero-quantity rows so removal is an RLS-protected UPDATE event.
  insert into public.cart_items(user_id,product_id,quantity) values(customer,p_product_id,greatest(amount,0))
    on conflict(user_id,product_id) do update set quantity=excluded.quantity,updated_at=now();
end; $$;
revoke all on function public.change_cart_item(text,integer) from public;
grant execute on function public.change_cart_item(text,integer) to authenticated;

create or replace function public.consume_my_cart(p_items jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>30 then raise exception 'Invalid cart'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    perform public.change_cart_item(item->>'productId',-(item->>'quantity')::integer);
  end loop;
end; $$;
revoke all on function public.consume_my_cart(jsonb) from public;
grant execute on function public.consume_my_cart(jsonb) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cart_items') then
    alter publication supabase_realtime add table public.cart_items;
  end if;
end; $$;
commit;
