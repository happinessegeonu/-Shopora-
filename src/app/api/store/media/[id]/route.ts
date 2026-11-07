import { database } from "@/server/postgres";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  if (process.env.SHOPORA_BACKEND !== "postgres" || !/^[a-f0-9-]{36}$/.test(params.id)) return new Response(null, { status: 404 });
  try {
    const { rows } = await database().query("select content_type,data from shopora_media where id=$1", [params.id]);
    if (!rows.length) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(rows[0].data), { headers: { "Content-Type": rows[0].content_type, "X-Content-Type-Options": "nosniff", "Cache-Control": "public,max-age=86400" } });
  } catch { return new Response(null, { status: 503 }); }
}
