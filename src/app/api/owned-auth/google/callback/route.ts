import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authDatabase } from "@/lib/owned-auth/database";
import { ownedAuth } from "@/lib/owned-auth/server";
import { tokenHash, validToken } from "@/lib/owned-auth/crypto";
import { googleClient, googleClaims, sameSecret } from "@/lib/owned-auth/google";
import { COOKIE_NAME, SESSION_SECONDS } from "@/lib/owned-auth/service";
import { appOrigin } from "@/lib/owned-auth/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const auth = ownedAuth(), params = new URL(request.url).searchParams;
    const state = params.get("state"), saved = (await cookies()).get("shopora_oauth_state")?.value;
    if (!validToken(state) || !saved || !sameSecret(state, saved) || !params.get("code") || params.has("error")) throw new Error("Invalid OAuth callback");
    const { rows } = await authDatabase().query("delete from shopora_auth.oauth_flows where state_hash=$1 and expires_at>now() returning *", [tokenHash(state)]);
    const flow = rows[0]; if (!flow) throw new Error("Expired OAuth callback");
    const client = googleClient();
    const { tokens } = await client.getToken({ code: params.get("code")!, codeVerifier: flow.verifier });
    if (!tokens.id_token) throw new Error("No Google identity");
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const claims = googleClaims(ticket.getPayload() as Parameters<typeof googleClaims>[0], flow.nonce);
    const result = await auth.googleIdentity(claims.subject, claims.email, (await cookies()).get(COOKIE_NAME)?.value);
    const response = NextResponse.redirect(new URL(flow.next_path, appOrigin()));
    response.cookies.set(COOKIE_NAME, result.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
    response.cookies.set("shopora_oauth_state", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    response.headers.set("Cache-Control", "no-store"); response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    try { return NextResponse.redirect(new URL("/?signin=1&auth=error", appOrigin())); }
    catch { return Response.json({ error: "Sign-in is not configured." }, { status: 503 }); }
  }
}
