-- Idempotency keys prevent retrying a submitted checkout from creating a duplicate.
create table if not exists shopora_checkout_requests (
 request_key uuid primary key,
 customer_id uuid references shopora_auth.users(id) on delete set null,
 request_hash text not null,
 order_id uuid not null unique references shopora_orders(id) on delete cascade,
 created_at timestamptz not null default now()
);
revoke all on shopora_checkout_requests from public;
do $$ begin
 if exists (select 1 from pg_roles where rolname='shopora_app') then
  grant select,insert on shopora_checkout_requests to shopora_app;
 end if;
end $$;
