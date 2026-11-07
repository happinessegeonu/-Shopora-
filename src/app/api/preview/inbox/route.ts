import { assertPreviewIsolation, isPreview } from "@/lib/preview-mode";
import { database } from "@/server/postgres";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!isPreview()) return Response.json({ error: "Not found." }, { status: 404 });
  try {
    assertPreviewIsolation();
    const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
    if (!email || email.length > 254) return Response.json({ error: "Enter the fictional email you used for testing." }, { status: 400 });
    const result = await database().query("select id,recipient,subject,body,created_at from shopora_preview_messages where lower(recipient)=$1 order by created_at desc limit 25", [email]);
    return Response.json({ data: result.rows, simulated: true }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch { return Response.json({ error: "Test inbox is unavailable." }, { status: 503 }); }
}
