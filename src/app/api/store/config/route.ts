export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ owned: true, enabled: process.env.OWNED_AUTH_ENABLED === "true" && process.env.SHOPORA_BACKEND === "postgres", google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) }, { headers: { "Cache-Control": "no-store" } });
}
