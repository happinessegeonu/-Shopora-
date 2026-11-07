import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import type { Database } from "../src/lib/owned-auth/database";
import { changeCart, readCart } from "../src/server/cart";
import { createOrder, validateCheckout } from "../src/server/checkout";
import { OwnedAuth } from "../src/lib/owned-auth/service";
// @ts-ignore JS migration helper is exercised directly against the same engine.
import { commerceTables, importSnapshot, mappedRow } from "../scripts/migration-data.mjs";
async function fixture() {
 const pg = new PGlite();
 for (const name of ["owned-auth.sql","shopora.sql","operations.sql","checkout-requests.sql"]) await pg.exec(readFileSync(`database/${name}`,"utf8"));
 const adapter = (connection: any): Database => ({ query: (sql,values) => connection.query(sql,values), transaction: work => connection.transaction((tx: any) => work(adapter(tx))) });
 return { pg, db: adapter(pg) };
}
test("cart ownership, authoritative checkout totals, stock, commission and rollback", async () => {
 const {pg,db}=await fixture();
 try {
  const alice=randomUUID(),bob=randomUUID(),listing=randomUUID(),product=`seller-${listing}`;
  await pg.query("insert into shopora_auth.users(id,email,verified_at) values($1,'alice@example.com',now()),($2,'bob@example.com',now())",[alice,bob]);
  await pg.query("insert into shopora_products(id,name,price_minor,stock) values($1,'Seller product',2000000,5)",[product]);
  await pg.query("insert into shopora_seller_listings(id,seller_id,store_name,contact_phone,name,description,category,price_minor,image_url,status) values($1,$2,'Store','08012345678','Seller product','An accurate product description','Other',2000000,'/test.jpg','approved')",[listing,bob]);
  await pg.exec("insert into shopora_shipping_rates(state,fee_minor) values('Lagos',500000)");
  await changeCart(alice,product,2,db); await changeCart(bob,product,1,db);
  assert.equal((await readCart(alice,db))[0].quantity,2); assert.equal((await readCart(bob,db))[0].quantity,1);
  const details=validateCheckout({email:'alice@example.com',senderName:'Alice',senderPhone:'08012345678',receiverName:'Alice',receiverPhone:'08012345678',location:'Ikeja',state:'Lagos',address:'Test address',items:[{productId:product,quantity:2,price:1}],totalMinor:1,customer_id:bob});
  const key=randomUUID();const order=await createOrder(details,alice,db,key);
  const replay=await createOrder(details,alice,db,key);assert.equal(replay.orderNumber,order.orderNumber);assert.equal(replay.replayed,true);
  await assert.rejects(createOrder(details,bob,db,key),/different order/);
  assert.equal(order.subtotalMinor,4000000); assert.equal(order.totalMinor,4500000);
  assert.equal((await readCart(alice,db)).length,0); assert.equal((await readCart(bob,db))[0].quantity,1);
  const saved=(await pg.query<{customer_id:string}>("select customer_id from shopora_orders")).rows[0]; assert.equal(saved.customer_id,alice);
  const commission=(await pg.query<{commission_minor:number|string;seller_share_minor:number|string}>("select * from shopora_seller_commissions")).rows[0];
  assert.equal(Number(commission.commission_minor),400000); assert.equal(Number(commission.seller_share_minor),3600000);
  assert.equal(Number((await pg.query<{stock:number}>("select stock from shopora_products")).rows[0].stock),3);
  await assert.rejects(createOrder({...details,items:[{productId:product,quantity:4}]},alice,db),/unavailable/);
  assert.equal(Number((await pg.query<{n:number}>("select count(*) as n from shopora_orders")).rows[0].n),1);
 } finally {await pg.close();}
});
test("legacy import keeps UUIDs, ownership, private bank data, contacts and totals; Google uses imported subject", async () => {
 const {pg,db}=await fixture();
 try {
  const id=randomUUID(),orderId=randomUUID(), tables: Record<string,any[]> = Object.fromEntries(commerceTables.map((name:string)=>[name,[]]));
  tables.products=[{id:'old-product',name:'Existing',price_minor:1000,active:true}];
  tables.cart_items=[{user_id:id,product_id:'old-product',quantity:3}];
  tables.seller_payout_accounts=[{seller_id:id,bank_name:'UBA',account_name:'Existing Seller',account_number:'0001234567'}];
  tables.orders=[{id:orderId,order_number:'SH-OLD',customer_id:id,email:'existing@example.com',customer_name:'Existing',sender_phone:'08012345678',delivery_address:'Historical address',total_minor:501000,shipping_minor:500000}];
  const snapshot={format:1,users:[{id,email:'Existing@Example.com',email_confirmed_at:new Date().toISOString()}],googleIdentities:[{subject:'trusted-imported-subject',user_id:id}],tables};
  await db.transaction(tx=>importSnapshot(tx,snapshot));
  assert.equal((await readCart(id,db))[0].quantity,3);
  assert.equal((await pg.query<{account_number:string}>("select account_number from shopora_seller_payout_accounts")).rows[0].account_number,'0001234567');
  const original=(await pg.query<{customer_phone:string;customer_id:string;total_minor:string}>("select * from shopora_orders")).rows[0];
  assert.equal(original.customer_phone,'08012345678'); assert.equal(original.customer_id,id); assert.equal(Number(original.total_minor),501000);
  const auth=new OwnedAuth(db,async()=>{},'migration-test-secret'.repeat(3));
  assert.equal((await auth.googleIdentity('trusted-imported-subject','existing@example.com')).user.id,id);
  await assert.rejects(auth.googleIdentity('different-subject','existing@example.com'),/already has an account/);
  await assert.rejects(db.transaction(tx=>importSnapshot(tx,snapshot)),/empty target/);
  assert.equal(mappedRow('orders',tables.orders[0]).subtotal_minor,'1000');
 } finally {await pg.close();}
});
test("runtime database grants exclude approval, payment status and schema administration", async () => {
 const {pg}=await fixture();
 try {
  await pg.exec("create role shopora_app login");
  await pg.exec(readFileSync("database/app-role-grants.sql","utf8"));
  await pg.exec("set role shopora_app");
  await pg.query("select id from shopora_auth.users limit 1");
  await pg.query("select id from shopora_products limit 1");
  await assert.rejects(pg.exec("update shopora_orders set status='paid'"),/permission denied/);
  await assert.rejects(pg.exec("update shopora_seller_listings set status='approved'"),/permission denied/);
  await assert.rejects(pg.exec("update shopora_reviews set approved=true"),/permission denied/);
  await assert.rejects(pg.exec("delete from shopora_auth.users"),/permission denied/);
  await assert.rejects(pg.exec("create table shopora_auth.unwanted(id integer)"),/permission denied/);
 } finally {await pg.close();}
});
