import { database } from "@/server/postgres";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    if (process.env.OWNED_AUTH_ENABLED !== "true" || process.env.SHOPORA_BACKEND !== "postgres" || !process.env.AUTH_APP_ORIGIN || (process.env.AUTH_RATE_SECRET?.length || 0) < 32) throw new Error("Not configured");
    await database().query("select 1 from shopora_auth.users limit 1");
    await database().query("select 1 from shopora_products limit 1");
    await database().query("select 1 from shopora_checkout_requests limit 1");
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
