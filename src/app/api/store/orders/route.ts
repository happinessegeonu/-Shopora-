import { requestUser } from "@/server/auth";
import { createOrder,validateCheckout } from "@/server/checkout";
import { requireSameOriginMutation,StoreError } from "@/server/request-security";
import { sendOrderEmails } from "@/lib/order-email";
import { readBody } from "@/lib/owned-auth/http";
import { AuthError } from "@/lib/owned-auth/service";
import { ownedAuth, requestOwnedToken } from "@/lib/owned-auth/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
 if(process.env.SHOPORA_BACKEND!=="postgres") return Response.json({error:"Migration not activated."},{status:503});
 try {
  requireSameOriginMutation(request);
  const user=await requestUser(request);
  if((request.headers.has("authorization") || await requestOwnedToken(request)) && !user) return Response.json({error:"Please sign in again."},{status:401});
  const body=await readBody(request, 16384);
  const details=validateCheckout(body);
  await ownedAuth().limit("checkout",user?.id??"guest");
  const order=await createOrder(details,user?.id??null);
  // Delivery failures never turn a committed order into a failed checkout.
  let notifications={emailSent:false,ownerEmailSent:false};
  try {
   notifications=await sendOrderEmails({...details,...order,location:`${details.location}, ${details.state}`});
  } catch {
   console.error("Order saved but email notification failed");
  }
  return Response.json({...order,items:undefined,...notifications,cartCleared:true},{status:201,headers:{"Cache-Control":"no-store"}});
 } catch(error) {
  if(error instanceof Error && error.message==="ORIGIN_REJECTED") return Response.json({error:"Request origin rejected."},{status:403});
  if(error instanceof StoreError || error instanceof AuthError) return Response.json({error:error.message},{status:error.status});
  return Response.json({error:"Could not place your order. Please try again."},{status:503});
 }
}
