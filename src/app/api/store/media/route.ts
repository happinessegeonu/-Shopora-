import { database } from "@/server/postgres";
import { requestUser } from "@/server/auth";
import { ownedAuth } from "@/lib/owned-auth/server";
import { requireSameOriginMutation } from "@/server/request-security";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (process.env.OWNED_AUTH_ENABLED !== "true" || process.env.SHOPORA_BACKEND !== "postgres") return Response.json({ error: "Migration not activated." }, { status: 503 });
  try {
    requireSameOriginMutation(request);
    const user = await requestUser(request); if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
    await ownedAuth().limit("photo-upload", user.id);
    if (!request.body) return Response.json({ error: "Choose a photo." }, { status: 400 });
    const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 4 * 1024 * 1024) { await reader.cancel(); return Response.json({ error: "Photo must be smaller than 4 MB." }, { status: 413 }); } chunks.push(part.value); } } finally { reader.releaseLock(); }
    const data = Buffer.concat(chunks), mime = request.headers.get("content-type");
    const valid = mime === "image/jpeg" ? data.subarray(0, 3).equals(Buffer.from([255, 216, 255])) : mime === "image/png" ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : mime === "image/webp" && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
    if (!valid) return Response.json({ error: "Choose a JPG, PNG or WebP photo." }, { status: 400 });
    const result = await database().query("insert into shopora_media(owner_id,content_type,data) values($1,$2,$3) returning id", [user.id, mime, data]);
    return Response.json({ url: `/api/store/media/${result.rows[0].id}` }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Photo could not be uploaded." }, { status: 400 }); }
}
