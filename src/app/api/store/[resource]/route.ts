import { database } from "@/server/postgres";
import { requestUser } from "@/server/auth";
import { requireSameOriginMutation, StoreError } from "@/server/request-security";
import { readBody } from "@/lib/owned-auth/http";
import { ownedAuth } from "@/lib/owned-auth/server";
import { AuthError } from "@/lib/owned-auth/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function enabled() { if (process.env.OWNED_AUTH_ENABLED !== "true" || process.env.SHOPORA_BACKEND !== "postgres") throw new StoreError("Migration not activated.", 503); }
function failure(error: unknown) {
  if (error instanceof StoreError || error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status, headers });
  if (error instanceof Error && error.message === "ORIGIN_REJECTED") return Response.json({ error: "Request origin rejected." }, { status: 403, headers });
  return Response.json({ error: "Could not complete this request. Please retry." }, { status: 503, headers });
}
export async function GET(request: Request, context: { params: Promise<{ resource: string }> }) {
  const params = await context.params;
  try {
    enabled();
    if (params.resource === "reviews") return Response.json({ data: (await database().query("select id,display_name,rating,body from shopora_reviews where approved=true order by created_at desc limit 12")).rows }, { headers });
    const user = await requestUser(request); if (!user) throw new StoreError("Please sign in.", 401);
    if (params.resource === "listings") return Response.json({ data: (await database().query("select id,name,status,price_minor::float8 as price_minor,image_url from shopora_seller_listings where seller_id=$1 order by created_at desc", [user.id])).rows }, { headers });
    if (params.resource === "payouts") return Response.json({ data: (await database().query("select bank_name,account_name,account_number from shopora_seller_payout_accounts where seller_id=$1", [user.id])).rows[0] ?? null }, { headers });
    throw new StoreError("Not found.", 404);
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: { params: Promise<{ resource: string }> }) {
  const params = await context.params;
  try {
    enabled(); requireSameOriginMutation(request);
    const user = await requestUser(request); if (!user) throw new StoreError("Please sign in.", 401);
    const body = await readBody(request);
    const field = (key: string, min: number, max: number) => { const value = typeof body[key] === "string" ? (body[key] as string).trim() : ""; if (value.length < min || value.length > max) throw new StoreError(`Please check ${key.replaceAll("_", " ")}.`); return value; };
    await ownedAuth().limit(`store-${params.resource}`, user.id);
    if (params.resource === "payouts") {
      const bank = field("bank_name", 2, 100), name = field("account_name", 2, 120), number = field("account_number", 10, 10);
      if (!/^\d{10}$/.test(number)) throw new StoreError("Enter a 10-digit account number.");
      await database().query("insert into shopora_seller_payout_accounts(seller_id,bank_name,account_name,account_number) values($1,$2,$3,$4) on conflict(seller_id) do update set bank_name=$2,account_name=$3,account_number=$4", [user.id, bank, name, number]);
      return Response.json({ saved: true }, { headers });
    }
    if (params.resource === "reviews") {
      if (!Number.isInteger(body.rating) || Number(body.rating) < 1 || Number(body.rating) > 5) throw new StoreError("Choose a rating from 1 to 5.");
      await database().query("insert into shopora_reviews(customer_id,display_name,rating,body) values($1,$2,$3,$4)", [user.id, field("display_name", 1, 80), body.rating, field("body", 10, 2000)]);
      return Response.json({ saved: true }, { status: 201, headers });
    }
    if (params.resource === "listings") {
      const category = field("category", 1, 30), image = field("image_url", 1, 200);
      if (!["Electronics", "Wigs", "Perfumes", "Fashion", "Home", "Other"].includes(category) || body.commissionAgreement !== true || !Number.isSafeInteger(body.price_minor) || Number(body.price_minor) < 100 || Number(body.price_minor) > 10000000000) throw new StoreError("Check the price, category, and commission agreement.");
      const mediaId = image.match(/^\/api\/store\/media\/([a-f0-9-]{36})$/)?.[1];
      if (!mediaId || !(await database().query("select id from shopora_media where id=$1 and owner_id=$2", [mediaId, user.id])).rows.length) throw new StoreError("Upload your own product photo first.");
      const result = await database().query("insert into shopora_seller_listings(seller_id,store_name,contact_phone,name,description,category,price_minor,image_url) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,name,status,price_minor::float8 as price_minor,image_url", [user.id, field("store_name", 2, 80), field("contact_phone", 7, 30), field("name", 2, 120), field("description", 10, 2000), category, body.price_minor, image]);
      return Response.json({ data: result.rows[0] }, { status: 201, headers });
    }
    throw new StoreError("Not found.", 404);
  } catch (error) { return failure(error); }
}
