create index if not exists shopora_reviews_public_idx on shopora_reviews(created_at desc) where approved=true;
create index if not exists shopora_order_items_order_idx on shopora_order_items(order_id);
create index if not exists shopora_auth_challenges_expiry_idx on shopora_auth.challenges(expires_at);
create index if not exists shopora_auth_rate_expiry_idx on shopora_auth.rate_limits(expires_at);
create index if not exists shopora_auth_google_user_idx on shopora_auth.google_identities(user_id);
-- Manual operations only. Never expose this report through a public gateway.
create or replace view shopora_seller_commission_report as
select c.*,o.order_number,o.status as order_status,i.product_name,i.quantity,
 case when o.status in ('cancelled','refunded') then 0 else c.commission_minor end as effective_commission_minor,
 case when o.status in ('paid','processing','shipped') and c.delivery_confirmed_at is not null
 and c.settled_at is null then c.seller_share_minor else 0 end as payable_minor
from shopora_seller_commissions c join shopora_order_items i on i.id=c.order_item_id
join shopora_orders o on o.id=i.order_id;
revoke all on shopora_seller_commission_report from public;
