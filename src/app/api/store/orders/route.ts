import { requestUser } from "@/server/auth";
import { createOrder,validateCheckout } from "@/server/checkout";
import { requireSameOriginMutation,StoreError } from "@/server/request-security";
import { sendOrderEmails } from "@/lib/order-email";
import { readBody } from "@/lib/owned-auth/http";
import { AuthError } from "@/lib/owned-auth/service";
import { ownedAuth, requestOwnedToken } from "@/lib/owned-auth/server";
import { database } from "@/server/postgres";
import { isPreviewEmail } from "@/lib/preview-mode";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request: Request) {
 if(process.env.SHOPORA_BACKEND!=="postgres") return Response.json({error:"Store is not configured."},{status:503});
 try {
  const user=await requestUser(request); if(!user) return Response.json({error:"Please sign in to view your orders."},{status:401});
  const reference=new URL(request.url).searchParams.get("reference");
  const result=await database().query(`select o.order_number,o.created_at,o.status,o.subtotal_minor::float8 as subtotal_minor,o.shipping_minor::float8 as shipping_minor,o.total_minor::float8 as total_minor,o.delivery_state,
   coalesce((select jsonb_agg(jsonb_build_object('name',i.product_name,'quantity',i.quantity,'line_total',i.line_total)) from shopora_order_items i where i.order_id=o.id),'[]'::jsonb) as items
   from shopora_orders o where o.customer_id=$1 and ($2::text is null or o.order_number=$2) order by o.created_at desc limit 50`,[user.id,reference]);
  if(reference&&!result.rows.length) return Response.json({error:"Order not found."},{status:404});
  return Response.json({data:result.rows},{headers:{"Cache-Control":"no-store"}});
 } catch {return Response.json({error:"Could not load your orders. Please retry."},{status:503});}
}
export async function POST(request:Request) {
 if(process.env.SHOPORA_BACKEND!=="postgres") return Response.json({error:"Migration not activated."},{status:503});
 try {
  requireSameOriginMutation(request);
  const user=await requestUser(request);
  if((request.headers.has("authorization") || await requestOwnedToken(request)) && !user) return Response.json({error:"Please sign in again."},{status:401});
  const body=await readBody(request, 16384);
  const details=validateCheckout(body);
  if(process.env.SHOPORA_PREVIEW==="true"&&!isPreviewEmail(details.email))throw new StoreError("Use a fictional email ending in @example.test in the preview.");
  const requestKey=request.headers.get("idempotency-key");
  if(requestKey&&!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestKey))throw new StoreError("Invalid checkout reference.");
  await ownedAuth().limit("checkout",user?.id??"guest");
  const order=await createOrder(details,user?.id??null,undefined,requestKey||undefined);
  // Delivery failures never turn a committed order into a failed checkout.
  let notifications={emailSent:false,ownerEmailSent:false};
  try {
   if(!order.replayed) notifications=await sendOrderEmails({...details,...order,location:`${details.location}, ${details.state}`});
  } catch {
   console.error("Order saved but email notification failed");
  }
  return Response.json({...order,items:undefined,...notifications,cartCleared:true,simulated:process.env.SHOPORA_PREVIEW==="true"},{status:order.replayed?200:201,headers:{"Cache-Control":"no-store"}});
 } catch(error) {
  if(error instanceof Error && error.message==="ORIGIN_REJECTED") return Response.json({error:"Request origin rejected."},{status:403});
  if(error instanceof StoreError || error instanceof AuthError) return Response.json({error:error.message},{status:error.status});
  return Response.json({error:"Could not place your order. Please try again."},{status:503});
 }
}
