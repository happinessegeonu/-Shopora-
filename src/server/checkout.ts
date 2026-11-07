import { database } from "./postgres";
import type { Database } from "@/lib/owned-auth/database";
import { StoreError } from "./request-security";

type Item = { productId: string; quantity: number };
export type Checkout = { email: string; senderName: string; senderPhone: string; receiverName: string; receiverPhone: string; location: string; state: string; address: string; items: Item[] };
export function validateCheckout(value: unknown): Checkout {
  if (!value || typeof value!=="object") throw new StoreError("Please check your checkout details.");
  const body=value as Record<string,unknown>;
  const text=(key:string,max:number) => typeof body[key]==="string" ? (body[key] as string).trim().slice(0,max) : "";
  const result={email:text("email",254),senderName:text("senderName",120),senderPhone:text("senderPhone",30),receiverName:text("receiverName",120),receiverPhone:text("receiverPhone",30),location:text("location",80),state:text("state",80),address:text("address",600),items:[] as Item[]};
  if(!/^\S+@\S+\.\S+$/.test(result.email) || !result.senderName || result.senderPhone.length<7 || !result.receiverName || result.receiverPhone.length<7 || !result.location || !result.state || !result.address) throw new StoreError("Please enter valid contact and delivery details.");
  if(!Array.isArray(body.items) || body.items.length<1 || body.items.length>30) throw new StoreError("Choose between 1 and 30 different products.");
  const ids=new Set<string>();
  for(const row of body.items) {
    if(!row || typeof row.productId!=="string" || !row.productId || row.productId.length>200 || !Number.isInteger(row.quantity) || row.quantity<1 || row.quantity>50 || ids.has(row.productId)) throw new StoreError("Please check the products and quantities in your bag.");
    ids.add(row.productId); result.items.push({productId:row.productId,quantity:row.quantity});
  }
  return result;
}
export async function createOrder(details: Checkout, userId: string | null, db: Database = database()) {
 return db.transaction(async client => {
  // The same per-customer lock serializes checkout with concurrent cart mutations.
  if(userId) await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",[userId]);
  const shipping=await client.query("select fee_minor from shopora_shipping_rates where lower(state)=lower($1) and active=true for share",[details.state]);
  if(!shipping.rows.length) throw new StoreError("Delivery is unavailable for the selected state.");
  const products=await client.query("select id,name,price_minor,stock from shopora_products where id=any($1::text[]) and active=true order by id for update",[details.items.map(item=>item.productId)]);
  const byId=new Map(products.rows.map(product=>[product.id,product]));
  let subtotal=0;
  const lines=details.items.map(item=>{
    const product=byId.get(item.productId);
    if(!product || (product.stock!==null && product.stock<item.quantity)) throw new StoreError("One of these items is unavailable in that quantity.");
    const unit=Number(product.price_minor), total=unit*item.quantity; subtotal+=total;
    return {...item,name:String(product.name),unit,line_total:total};
  });
  const shippingMinor=Number(shipping.rows[0].fee_minor),total=subtotal+shippingMinor;
  const saved=await client.query(`insert into shopora_orders(customer_id,email,customer_name,customer_phone,receiver_name,receiver_phone,delivery_location,delivery_state,delivery_address,subtotal_minor,shipping_minor,total_minor)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id,order_number`,[userId,details.email.toLowerCase(),details.senderName,details.senderPhone,details.receiverName,details.receiverPhone,details.location,details.state,details.address,subtotal,shippingMinor,total]);
  for(const line of lines) {
    await client.query("update shopora_products set stock=stock-$2 where id=$1 and stock is not null",[line.productId,line.quantity]);
    const item=await client.query("insert into shopora_order_items(order_id,product_id,product_name,unit_price_minor,quantity,line_total) values($1,$2,$3,$4,$5,$6) returning id",[saved.rows[0].id,line.productId,line.name,line.unit,line.quantity,line.line_total]);
    const seller=await client.query("select seller_id,store_name from shopora_seller_listings where 'seller-'||id::text=$1 and status='approved'",[line.productId]);
    if(seller.rows.length) {
      const commission=Math.round(line.line_total/10);
      await client.query("insert into shopora_seller_commissions(order_item_id,seller_id,store_name,sale_minor,commission_minor,seller_share_minor) values($1,$2,$3,$4,$5,$6)",[item.rows[0].id,seller.rows[0].seller_id,seller.rows[0].store_name,line.line_total,commission,line.line_total-commission]);
    }
    if(userId) await client.query("update shopora_cart_items set quantity=greatest(0,quantity-$3),updated_at=now() where user_id=$1 and product_id=$2",[userId,line.productId,line.quantity]);
  }
  return {orderNumber:saved.rows[0].order_number as string,subtotalMinor:subtotal,shippingMinor,totalMinor:total,items:lines.map(line=>({name:line.name,quantity:line.quantity,line_total:line.line_total}))};
 });
}
