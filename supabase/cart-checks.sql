begin;
select set_config('test.cart_user',(select id::text from auth.users limit 1),true);
select set_config('test.cart_product',(select id from public.products where active limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('test.cart_user'),true);
set local role authenticated;
do $$
declare product text:=current_setting('test.cart_product'); before_qty integer; after_qty integer;
begin
  select coalesce(max(quantity),0) into before_qty from public.cart_items where product_id=product;
  perform public.change_cart_item(product,1);
  perform public.change_cart_item(product,1);
  select quantity into after_qty from public.cart_items where product_id=product;
  if after_qty<>before_qty+2 then raise exception 'Atomic additions failed'; end if;
  perform public.consume_my_cart(jsonb_build_array(jsonb_build_object('productId',product,'quantity',2)));
  select quantity into after_qty from public.cart_items where product_id=product;
  if after_qty<>before_qty then raise exception 'Order cart cleanup failed'; end if;
  begin
    perform public.change_cart_item(product,51);
    raise exception 'Quantity limit bypassed';
  exception when others then
    if sqlerrm='Quantity limit bypassed' then raise; end if;
  end;
  if has_table_privilege('authenticated','public.cart_items','update') then raise exception 'Direct update exposed'; end if;
end; $$;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$ begin
  if exists(select 1 from public.cart_items where user_id=current_setting('test.cart_user')::uuid) then raise exception 'Other account cart exposed'; end if;
end; $$;
reset role;
rollback;
select 'Atomic cart additions, purchase cleanup, quantity limits and account isolation passed' as result;
