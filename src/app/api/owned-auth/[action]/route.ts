import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ownedAuth, requestOwnedToken } from "@/lib/owned-auth/server";
import { AuthError, COOKIE_NAME, SESSION_SECONDS } from "@/lib/owned-auth/service";
import { checkOrigin, readBody } from "@/lib/owned-auth/http";
import { isPreviewEmail } from "@/lib/preview-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production" || process.env.AUTH_APP_ORIGIN?.startsWith("https://"), sameSite: "lax" as const, path: "/" };
function failure(error: unknown) {
  if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { ...headers, ...(error.status === 429 ? { "Retry-After": "900" } : {}) } });
  console.error("Owned authentication request failed");
  return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503, headers });
}
export async function GET(request: Request, context: { params: Promise<{ action: string }> }) {
  const params = await context.params;
  if (params.action !== "session") return NextResponse.json({ error: "Not found." }, { status: 404, headers });
  try { return NextResponse.json({ user: await ownedAuth().session(await requestOwnedToken(request)) }, { headers }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const params = await context.params;
  try {
    checkOrigin(request);
    const body = await readBody(request);
    if (process.env.SHOPORA_PREVIEW === "true" && ["register", "resend", "forgot", "login"].includes(params.action) && !isPreviewEmail(body.email)) throw new AuthError("Use a fictional email ending in @example.test in this preview.");
    const auth = ownedAuth();
    // Native clients never use ambient cookies; browser clients never receive a token in JSON.
    const native = !request.headers.has("origin") && request.headers.get("x-shopora-native") === "1";
    const token = native ? request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1] : (await cookies()).get(COOKIE_NAME)?.value;
    switch (params.action) {
      case "register": case "resend": return NextResponse.json(await auth.requestEmail(body.email, "verify"), { headers });
      case "forgot": return NextResponse.json(await auth.requestEmail(body.email, "reset"), { headers });
      case "verify": case "reset": return NextResponse.json(await auth.complete(body.token, body.password, params.action), { headers });
      case "login": {
        const result = await auth.login(body.email, body.password, token);
        const response = NextResponse.json({ user: result.user, ...(native ? { token: result.token } : {}) }, { headers });
        if (!native) response.cookies.set(COOKIE_NAME, result.token, { ...cookieOptions, maxAge: SESSION_SECONDS });
        return response;
      }
      case "logout": {
        await auth.logout(token);
        const response = NextResponse.json({ message: "Signed out." }, { headers });
        if (!native) response.cookies.set(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
        return response;
      }
      default: return NextResponse.json({ error: "Not found." }, { status: 404, headers });
    }
  } catch (error) { return failure(error); }
}
