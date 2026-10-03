-- Run after the shipping-inclusive checkout deployment succeeds.
-- Removes legacy procedures so orders cannot bypass the shipping charge.
begin;
drop function if exists public.create_store_order(text,text,text,jsonb,uuid);
drop function if exists public.create_store_order(text,text,text,text,text,text,text,jsonb,uuid);
commit;
