import { database } from "./postgres";
import { StoreError } from "./request-security";
import type { Database } from "@/lib/owned-auth/database";

export async function readCart(userId: string, db: Database = database()) {
  const result = await db.query(`select c.quantity,jsonb_build_object(
    'id',p.id,'name',p.name,'description',p.description,'price_minor',p.price_minor,
    'category',p.category,'image_url',p.image_url,'badge',p.badge,'color',p.color) as products
    from shopora_cart_items c join shopora_products p on p.id=c.product_id
    where c.user_id=$1 and c.quantity>0 order by p.id`, [userId]);
  return result.rows;
}
export async function changeCart(userId: string, productId: string, delta: number, db: Database = database()) {
  if (!productId || !Number.isInteger(delta) || Math.abs(delta)>50 || delta===0) throw new StoreError("Invalid cart change.");
  await db.transaction(async client => {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [userId]);
    const product = await client.query("select id from shopora_products where id=$1 and active=true", [productId]);
    if (!product.rows.length && delta>0) throw new StoreError("This product is unavailable.");
    if (!product.rows.length) {
      await client.query("update shopora_cart_items set quantity=greatest(0,quantity+$3),updated_at=now() where user_id=$1 and product_id=$2", [userId,productId,delta]);
      return;
    }
    await client.query(`insert into shopora_cart_items(user_id,product_id,quantity) values($1,$2,greatest(0,$3::integer))
      on conflict(user_id,product_id) do update set quantity=least(50,greatest(0,shopora_cart_items.quantity+$3)),updated_at=now()`, [userId,productId,delta]);
  });
}
