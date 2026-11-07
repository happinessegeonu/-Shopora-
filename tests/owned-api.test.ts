import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { OwnedAuth, AuthError } from "../src/lib/owned-auth/service";
import { checkOrigin, readBody } from "../src/lib/owned-auth/http";
import { StoreError, requireSameOriginMutation } from "../src/server/request-security";
import { changeCart, readCart } from "../src/server/cart";
import { createOrder, validateCheckout } from "../src/server/checkout";
import type { Database } from "../src/lib/owned-auth/database";
const require = createRequire(import.meta.url);
function route(path: string, modules: Record<string, unknown>) {
 const sandbox = { exports: {}, require: (name:string) => { if (!(name in modules)) throw new Error(`Unmocked dependency ${name}`); return modules[name]; }, Error, Response, Request, Headers, Buffer, Uint8Array, console, process, URL };
 vm.runInNewContext(ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
 return sandbox.exports as any;
}
test("actual route handlers use opaque sessions, secure cookies and isolate seller/cart/payout ownership", async () => {
 const pg=new PGlite();
 for (const name of ['owned-auth.sql','shopora.sql','operations.sql']) await pg.exec(readFileSync(`database/${name}`,'utf8'));
 const adapter=(connection:any):Database=>({query:(sql,values)=>connection.query(sql,values),transaction:work=>connection.transaction((tx:any)=>work(adapter(tx)))});
 const db=adapter(pg), emails: {token:string}[]=[];
 const auth=new OwnedAuth(db,async(_email,_purpose,token)=>{emails.push({token});},'api-test-secret'.repeat(4));
 const previous={...process.env}; process.env.AUTH_APP_ORIGIN='http://localhost:3000'; process.env.OWNED_AUTH_ENABLED='true';process.env.SHOPORA_BACKEND='postgres';
 let cookieToken:string|undefined;
 const token=(request:Request)=>request.headers.get('authorization')?.replace('Bearer ','') || cookieToken;
 const modules={
  'next/server':require('next/server'), 'next/headers':{cookies:async()=>({get:()=>cookieToken?{value:cookieToken}:undefined})},
  '@/lib/owned-auth/server':{ownedAuth:()=>auth,requestOwnedToken:async(request:Request)=>token(request)},
  '@/lib/owned-auth/service':{AuthError,COOKIE_NAME:'shopora_session',SESSION_SECONDS:604800},
  '@/lib/owned-auth/http':{checkOrigin,readBody},
  '@/server/auth':{requestUser:async(request:Request)=>auth.session(token(request))},
  '@/server/postgres':{database:()=>db},'@/server/request-security':{StoreError,requireSameOriginMutation},
  '@/server/cart':{readCart:(id:string)=>readCart(id,db),changeCart:(id:string,p:string,d:number)=>changeCart(id,p,d,db)},
  '@/server/checkout':{createOrder:(details:any,id:string)=>createOrder(details,id,db),validateCheckout},
  '@/lib/order-email':{sendOrderEmails:async()=>({emailSent:false,ownerEmailSent:false})},
 };
 const account=route('src/app/api/owned-auth/[action]/route.ts',modules);
 const resources=route('src/app/api/store/[resource]/route.ts',modules);
 const cart=route('src/app/api/store/cart/route.ts',modules);
 const orders=route('src/app/api/store/orders/route.ts',modules);
 const media=route('src/app/api/store/media/route.ts',modules);
 const request=(path:string,body?:unknown,headers:Record<string,string>={})=>new Request(`http://localhost:3000${path}`,{...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)}),headers:{origin:'http://localhost:3000','content-type':'application/json',...headers}});
 const action=(value:string)=>({params:Promise.resolve({action:value})});
 const resource=(value:string)=>({params:Promise.resolve({resource:value})});
 try {
  const register=await account.POST(request('/api/owned-auth/register',{email:'owner@example.com'}),action('register'));
  assert.equal(register.status,200); assert.equal((await register.json()).token,undefined);
  const password='a unique secure password for Shopora';
  assert.equal((await account.POST(request('/api/owned-auth/verify',{token:emails[0].token,password}),action('verify'))).status,200);
  const login=await account.POST(request('/api/owned-auth/login',{email:'owner@example.com',password}),action('login'));
  assert.equal(login.status,200); assert.match(login.headers.get('set-cookie')!,/HttpOnly/);assert.match(login.headers.get('set-cookie')!,/SameSite=lax/i);
  assert.equal((await login.json()).token,undefined,'browser JSON does not expose the bearer secret');
  cookieToken=decodeURIComponent(login.headers.get('set-cookie')!.match(/^shopora_session=([^;]+)/)![1]);
  const owner=(await auth.session(cookieToken))!;
  const other=await auth.googleIdentity('other-subject','other@example.com');
  await pg.exec("insert into shopora_products(id,name,price_minor) values('p','Product',1000); insert into shopora_shipping_rates(state,fee_minor) values('Lagos',500000)");
  assert.equal((await cart.POST(request('/api/store/cart',{productId:'p',delta:2,user_id:other.user.id}))).status,200);
  assert.equal((await readCart(owner.id,db))[0].quantity,2); assert.equal((await readCart(other.user.id,db)).length,0);
  const bank={bank_name:'UBA',account_name:'Owner',account_number:'0001234567',seller_id:other.user.id};
  assert.equal((await resources.POST(request('/api/store/payouts',bank),resource('payouts'))).status,200);
  const ownBank=await resources.GET(request('/api/store/payouts'),resource('payouts'));assert.equal((await ownBank.json()).data.account_number,'0001234567');
  const otherBank=await resources.GET(request('/api/store/payouts',undefined,{authorization:`Bearer ${other.token}`}),resource('payouts'));assert.equal((await otherBank.json()).data,null);
  const listing=await pg.query<{id:string}>("insert into shopora_seller_listings(seller_id,store_name,contact_phone,name,description,category,price_minor,image_url) values($1,'Store','08012345678','Product','A useful description','Other',1000,'/p.jpg') returning id",[owner.id]);
  assert.equal((await (await resources.GET(request('/api/store/listings'),resource('listings'))).json()).data[0].id,listing.rows[0].id);
  assert.equal((await (await resources.GET(request('/api/store/listings',undefined,{authorization:`Bearer ${other.token}`}),resource('listings'))).json()).data.length,0);
  const image=(await pg.query<{id:string}>("insert into shopora_media(owner_id,content_type,data) values($1,'image/png',$2) returning id",[owner.id,Buffer.from([137,80,78,71,13,10,26,10])])).rows[0].id;
  const submission={seller_id:other.user.id,store_name:'Owner Store',contact_phone:'08012345678',name:'New Product',description:'A useful product description',category:'Other',price_minor:1000,image_url:`/api/store/media/${image}`,commissionAgreement:true,status:'approved'};
  assert.equal((await resources.POST(request('/api/store/listings',submission),resource('listings'))).status,201);
  assert.equal((await resources.POST(request('/api/store/listings',submission,{authorization:`Bearer ${other.token}`}),resource('listings'))).status,400,'another seller cannot claim the uploaded image');
  const submitted=(await pg.query<{seller_id:string;status:string}>("select seller_id,status from shopora_seller_listings where name='New Product'")).rows[0];
  assert.equal(submitted.seller_id,owner.id);assert.equal(submitted.status,'pending','browser cannot approve its own listing');
  assert.equal((await cart.POST(request('/api/store/cart',{productId:'p',delta:1},{origin:'https://evil.example'}))).status,403);
  assert.equal((await cart.GET(request('/api/store/cart',undefined,{authorization:'Bearer '+ 'a'.repeat(64)}))).status,401);
  const forged={email:'owner@example.com',senderName:'Owner',senderPhone:'08012345678',receiverName:'Owner',receiverPhone:'08012345678',state:'Lagos',location:'Ikeja',address:'Test address',items:[{productId:'p',quantity:1}],customer_id:other.user.id,totalMinor:1};
  const placed=await orders.POST(request('/api/orders',forged)); assert.equal(placed.status,201);assert.equal((await placed.json()).totalMinor,501000);
  assert.equal((await pg.query<{customer_id:string}>("select customer_id from shopora_orders")).rows[0].customer_id,owner.id);
  assert.equal((await media.POST(new Request('http://localhost:3000/api/store/media',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'image/png'},body:'not a photo'}))).status,400);
  assert.equal((await account.POST(request('/api/owned-auth/logout',{}),action('logout'))).status,200);
  assert.equal(await auth.session(cookieToken),null);
  Object.assign(process.env,{NODE_ENV:'production',AUTH_APP_ORIGIN:'https://maketechlimited.com'});
  modules['@/lib/owned-auth/service'].COOKIE_NAME='__Host-shopora_session';
  const productionAccount=route('src/app/api/owned-auth/[action]/route.ts',modules);
  const secureLogin=await productionAccount.POST(new Request('https://maketechlimited.com/api/owned-auth/login',{method:'POST',headers:{origin:'https://maketechlimited.com','content-type':'application/json'},body:JSON.stringify({email:'owner@example.com',password})}),action('login'));
  assert.equal(secureLogin.status,200);assert.match(secureLogin.headers.get('set-cookie')!,/^__Host-shopora_session=/);assert.match(secureLogin.headers.get('set-cookie')!,/; Secure/);assert.match(secureLogin.headers.get('set-cookie')!,/; HttpOnly/);
 } finally { process.env=previous; await pg.close(); }
});
