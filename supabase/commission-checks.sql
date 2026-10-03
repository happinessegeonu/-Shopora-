-- Transactional integration checks: no test sales or products remain.
begin;
do $$
declare seller uuid; listing uuid:=gen_random_uuid(); result jsonb; recorded record; test_order uuid;
begin
  select id into seller from auth.users limit 1;
  if seller is null then raise exception 'Test requires an existing account'; end if;
  insert into public.seller_listings(id,seller_id,store_name,contact_phone,name,description,category,price_minor,image_url,status)
  values(listing,seller,'Commission check','00000000000','Commission test','Temporary commission test product','Other',2000000,
    'https://sjslqydjwxbpkxfnvvrv.supabase.co/storage/v1/object/public/seller-products/test.jpg','approved');
  insert into public.products(id,name,description,price_minor,category,image_url,color,active)
  values('seller-'||listing::text,'Commission test','Temporary test',2000000,'Other','/test.jpg','sand',true);
  result:=public.create_store_order('test@example.com','Test customer','00000000000','Test receiver','00000000000',
    'Test city, Lagos','Test address','Lagos',jsonb_build_array(jsonb_build_object('productId','seller-'||listing::text,'quantity',2)),null);
  test_order:=(result->>'order_id')::uuid;
  select r.* into recorded from public.seller_commission_report r join public.order_items i on i.id=r.order_item_id where i.order_id=test_order;
  if recorded.sale_minor<>4000000 or recorded.commission_minor<>400000 or recorded.seller_share_minor<>3600000
    or recorded.payable_minor<>0 or (result->>'total_minor')::bigint<>4500000 then raise exception 'Split or shipping check failed'; end if;
  update public.orders set status='paid' where id=test_order;
  if exists(select 1 from public.seller_commission_report where order_item_id=recorded.order_item_id and payable_minor<>0) then raise exception 'Delivery gate failed'; end if;
  update public.seller_commissions set delivery_confirmed_at=now() where order_item_id=recorded.order_item_id;
  if not exists(select 1 from public.seller_commission_report where order_item_id=recorded.order_item_id and payable_minor=3600000) then raise exception 'Payable check failed'; end if;
  update public.orders set status='refunded' where id=test_order;
  if exists(select 1 from public.seller_commission_report where order_item_id=recorded.order_item_id and (payable_minor<>0 or effective_commission_minor<>0)) then raise exception 'Refund check failed'; end if;
  if has_table_privilege('anon','public.seller_commission_report','select') or has_table_privilege('authenticated','public.seller_commissions','select') then raise exception 'Private report access failed'; end if;
end; $$;
rollback;
select 'Commission, shipping exclusion, payment/delivery gates, refund and privacy checks passed' as result;
