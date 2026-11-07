import { assertPreviewIsolation, isPreview } from "@/lib/preview-mode";
import { checkOrigin, readBody } from "@/lib/owned-auth/http";
import { database } from "@/server/postgres";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isPreview()) return Response.json({ error: "Not found." }, { status: 404 });
  try {
    assertPreviewIsolation(); checkOrigin(request); const body = await readBody(request, 16384);
    if (typeof body.note !== "string" || body.note.trim().length < 10 || body.note.length > 3500) return Response.json({ error: "Describe the issue in 10–3500 characters." }, { status: 400 });
    await database().query("insert into shopora_preview_feedback(note) values($1)", [body.note.trim()]);
    return Response.json({ saved: true, message: "Saved in the local test database. Also paste your report in our chat; it has not been sent to GitHub or support." }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Could not save the test feedback. Copy it into our chat instead." }, { status: 400 }); }
}
