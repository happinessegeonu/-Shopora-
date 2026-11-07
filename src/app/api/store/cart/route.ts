import { requestUser } from "@/server/auth";
import { readCart, changeCart } from "@/server/cart";
import { requireSameOriginMutation, StoreError } from "@/server/request-security";
import { readBody } from "@/lib/owned-auth/http";
import { AuthError } from "@/lib/owned-auth/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if(process.env.SHOPORA_BACKEND!=="postgres") return Response.json({error:"Migration not activated."},{status:503});
  try {
    const user=await requestUser(request); if(!user) return Response.json({error:"Sign in to view your cart."},{status:401});
    return Response.json({data:await readCart(user.id)},{headers:{"Cache-Control":"no-store"}});
  } catch { return Response.json({error:"Could not load your cart."},{status:503}); }
}
export async function POST(request: Request) {
  if(process.env.SHOPORA_BACKEND!=="postgres") return Response.json({error:"Migration not activated."},{status:503});
  try {
    requireSameOriginMutation(request);
    const user=await requestUser(request); if(!user) return Response.json({error:"Sign in to change your cart."},{status:401});
    const body=await readBody(request);
    if(typeof body.productId!=="string" || typeof body.delta!=="number") throw new StoreError("Invalid cart change.");
    await changeCart(user.id,body.productId,body.delta);
    return Response.json({data:await readCart(user.id)},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    if(error instanceof Error && error.message==="ORIGIN_REJECTED") return Response.json({error:"Request origin rejected."},{status:403});
    if(error instanceof StoreError || error instanceof AuthError) return Response.json({error:error.message},{status:error.status});
    return Response.json({error:"Your cart change was not saved."},{status:503});
  }
}
