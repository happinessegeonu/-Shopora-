-- Transactional checks: all test orders and stock changes are rolled back.
begin;
do $$
declare v_id text; v_price bigint; v_result jsonb; v_other jsonb; v_order public.orders%rowtype;
begin
  if (select count(*) from public.shipping_rates where active and fee_minor=500000) <> 37 then
    raise exception 'Expected 37 destinations priced at NGN 5000';
  end if;
  select id,price_minor into v_id,v_price from public.products
    where active and (stock is null or stock>=3) order by id limit 1;
  if v_id is null then raise exception 'No product available for transactional checkout checks'; end if;
  v_result:=public.create_store_order('checkout-test@example.invalid','Checkout test','00000000000',
    'Checkout test','00000000000','Test city, Lagos','Test address','Lagos',
    jsonb_build_array(jsonb_build_object('productId',v_id,'quantity',2)),null);
  if (v_result->>'shipping_minor')::bigint<>500000
    or (v_result->>'subtotal_minor')::bigint<>v_price*2
    or (v_result->>'total_minor')::bigint<>v_price*2+500000 then
    raise exception 'Incorrect multi-item checkout total';
  end if;
  select * into v_order from public.orders where id=(v_result->>'order_id')::uuid;
  if v_order.shipping_minor<>500000 or v_order.total_minor<>v_price*2+500000 or v_order.delivery_state<>'Lagos' then
    raise exception 'Stored order does not match the shipping-inclusive total';
  end if;
  v_other:=public.create_store_order('checkout-test@example.invalid','Checkout test','00000000000',
    'Checkout test','00000000000','Test city, Abuja','Test address','Federal Capital Territory (Abuja)',
    jsonb_build_array(jsonb_build_object('productId',v_id,'quantity',1)),null);
  if (v_other->>'shipping_minor')::bigint<>500000 or (v_other->>'total_minor')::bigint<>v_price+500000 then
    raise exception 'Abuja shipping total is incorrect';
  end if;
  begin
    perform public.create_store_order('checkout-test@example.invalid','Checkout test','00000000000',
      'Checkout test','00000000000','Test city','Test address','Unsupported destination',
      jsonb_build_array(jsonb_build_object('productId',v_id,'quantity',1)),null);
    raise exception 'Unsupported shipping destination was accepted';
  exception when others then
    if sqlerrm <> 'shipping unavailable' then raise; end if;
  end;
  begin
    perform public.create_store_order('checkout-test@example.invalid','Checkout test','00000000000',
      'Checkout test','00000000000','Test city','Test address','Lagos',
      jsonb_build_array(jsonb_build_object('productId',v_id,'quantity',1)),gen_random_uuid());
    raise exception 'Customer spoofing was accepted';
  exception when others then
    if sqlerrm <> 'invalid customer' then raise; end if;
  end;
end; $$;
rollback;
select 'Shipping checks passed; test orders and stock changes rolled back' as result;
