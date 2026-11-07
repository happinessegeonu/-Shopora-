import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { assertPreviewIsolation, isPreview } from "@/lib/preview-mode";
export function proxy(request: NextRequest) {
  if (!isPreview()) return NextResponse.next();
  try { assertPreviewIsolation(); } catch { return NextResponse.json({ error: "Preview isolation is not configured." }, { status: 503 }); }
  const path = request.nextUrl.pathname;
  if (path.startsWith("/_next/") || ["/preview-access", "/api/preview/access", "/api/health", "/favicon.ico"].includes(path)) return NextResponse.next();
  const expected = createHmac("sha256", process.env.SHOPORA_PREVIEW_ACCESS_CODE!).update("shopora-preview-access-v1").digest("hex");
  const actual = request.cookies.get("shopora_preview_access")?.value || "";
  if (/^[a-f0-9]{64}$/.test(actual) && timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
    const response=NextResponse.next(); response.headers.set("X-Robots-Tag","noindex, nofollow"); return response;
  }
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Unlock the isolated preview first." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(new URL("/preview-access", process.env.AUTH_APP_ORIGIN!));
}
export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
