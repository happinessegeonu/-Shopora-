alter table public.orders add column if not exists sender_phone text;
alter table public.orders add column if not exists receiver_name text;
alter table public.orders add column if not exists receiver_phone text;
alter table public.orders add column if not exists delivery_location text;

drop function if exists public.create_store_order(text,text,text,jsonb,uuid);
create function public.create_store_order(p_email text,p_name text,p_phone text,p_receiver_name text,p_receiver_phone text,p_location text,p_address text,p_items jsonb,p_customer_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order_id uuid; v_order_number text; v_total bigint:=0; v_item jsonb; v_product public.products%rowtype; v_qty integer; v_lines jsonb:='[]'::jsonb;
begin
if p_customer_id is not null and p_customer_id<>auth.uid() then raise exception 'invalid customer'; end if;
if length(trim(p_email)) not between 3 and 254 or length(trim(p_name)) not between 1 and 120 or length(trim(p_phone)) not between 7 and 30 or length(trim(p_receiver_name)) not between 1 and 120 or length(trim(p_receiver_phone)) not between 7 and 30 or length(trim(p_location)) not between 1 and 120 or length(trim(p_address)) not between 1 and 600 then raise exception 'invalid checkout details'; end if;
if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'invalid items'; end if;
if(select count(*)<>count(distinct value->>'productId') from jsonb_array_elements(p_items)) then raise exception 'duplicate product'; end if;
for v_item in select value from jsonb_array_elements(p_items) order by value->>'productId' loop
v_qty:=(v_item->>'quantity')::integer; if v_qty not between 1 and 50 then raise exception 'invalid quantity'; end if;
select * into v_product from public.products where id=v_item->>'productId' and active=true for update;
if not found or(v_product.stock is not null and v_product.stock<v_qty) then raise exception 'stock unavailable'; end if;
v_total:=v_total+v_product.price_minor*v_qty; end loop;
insert into public.orders(customer_id,email,customer_name,delivery_address,currency,total_minor,sender_phone,receiver_name,receiver_phone,delivery_location)
values(p_customer_id,lower(trim(p_email)),trim(p_name),trim(p_address),'NGN',v_total,trim(p_phone),trim(p_receiver_name),trim(p_receiver_phone),trim(p_location))
returning id,order_number into v_order_id,v_order_number;
for v_item in select value from jsonb_array_elements(p_items) loop
v_qty:=(v_item->>'quantity')::integer; select * into v_product from public.products where id=v_item->>'productId' and active=true;
update public.products set stock=stock-v_qty where id=v_product.id;
insert into public.order_items(order_id,product_id,product_name,unit_price_minor,quantity,line_total) values(v_order_id,v_product.id,v_product.name,v_product.price_minor,v_qty,v_product.price_minor*v_qty);
v_lines:=v_lines||jsonb_build_array(jsonb_build_object('name',v_product.name,'quantity',v_qty,'line_total',v_product.price_minor*v_qty)); end loop;
return jsonb_build_object('order_id',v_order_id,'order_number',v_order_number,'total_minor',v_total,'items',v_lines);
end; $$;
revoke all on function public.create_store_order(text,text,text,text,text,text,text,jsonb,uuid) from public;
grant execute on function public.create_store_order(text,text,text,text,text,text,text,jsonb,uuid) to anon,authenticated;
