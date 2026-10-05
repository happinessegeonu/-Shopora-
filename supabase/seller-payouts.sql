-- Private seller payout details. No customer-facing/public grants.
begin;
create table if not exists public.seller_payout_accounts (
 seller_id uuid primary key references auth.users(id) on delete cascade,
 bank_name text not null check (length(trim(bank_name)) between 2 and 100),
 account_name text not null check (length(trim(account_name)) between 2 and 120),
 account_number text not null check (account_number ~ '^[0-9]{10}$')
);
alter table public.seller_payout_accounts enable row level security;
revoke all on public.seller_payout_accounts from anon, authenticated;
grant select, insert, update on public.seller_payout_accounts to authenticated;
grant all on public.seller_payout_accounts to service_role;
create policy "Seller reads own payout account" on public.seller_payout_accounts for select to authenticated using (seller_id = (select auth.uid()));
create policy "Seller creates own payout account" on public.seller_payout_accounts for insert to authenticated with check (seller_id = (select auth.uid()));
create policy "Seller updates own payout account" on public.seller_payout_accounts for update to authenticated using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
commit;
