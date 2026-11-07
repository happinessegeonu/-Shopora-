import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { assertPreviewIsolation, isPreview } from "@/lib/preview-mode";
import { checkOrigin, readBody } from "@/lib/owned-auth/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isPreview()) return Response.json({ error: "Not found." }, { status: 404 });
  try {
    assertPreviewIsolation(); checkOrigin(request);
    const { code } = await readBody(request);
    const expected = process.env.SHOPORA_PREVIEW_ACCESS_CODE!;
    if (typeof code !== "string" || Buffer.byteLength(code) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(code), Buffer.from(expected))) return Response.json({ error: "The preview access code is incorrect." }, { status: 401 });
    const token = createHmac("sha256", expected).update("shopora-preview-access-v1").digest("hex");
    const response = NextResponse.json({ unlocked: true });
    response.cookies.set("shopora_preview_access", token, { httpOnly: true, secure: process.env.AUTH_APP_ORIGIN!.startsWith("https://"), sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 });
    response.headers.set("Cache-Control", "no-store"); return response;
  } catch { return Response.json({ error: "Could not unlock the preview." }, { status: 400 }); }
}
