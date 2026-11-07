-- Apply as the migration owner AFTER creating shopora_app privately.
-- psql: CREATE ROLE shopora_app LOGIN; then use \password shopora_app interactively.
grant usage on schema public,shopora_auth to shopora_app;
grant select,insert,update on shopora_auth.users to shopora_app;
grant select,insert,update,delete on shopora_auth.sessions,shopora_auth.challenges,
 shopora_auth.rate_limits,shopora_auth.oauth_flows to shopora_app;
grant select,insert on shopora_auth.google_identities to shopora_app;
grant select on shopora_products,shopora_shipping_rates to shopora_app;
grant update(stock) on shopora_products to shopora_app;
grant select,insert,update,delete on shopora_cart_items to shopora_app;
grant select,insert on shopora_orders,shopora_order_items,shopora_seller_commissions,
 shopora_reviews,shopora_media,shopora_seller_listings to shopora_app;
grant select,insert,update on shopora_seller_payout_accounts to shopora_app;
-- No migration-table, commission-report, review-approval, order-status or payout
-- settlement grants. Administrators use a separate private operations role.
