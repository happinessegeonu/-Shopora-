import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authDatabase } from "@/lib/owned-auth/database";
import { ownedAuth } from "@/lib/owned-auth/server";
import { newToken, tokenHash } from "@/lib/owned-auth/crypto";
import { googleClient, pkceChallenge } from "@/lib/owned-auth/google";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const auth = ownedAuth(); await auth.limit("google-start", "browser");
    const url = new URL(request.url);
    const state = newToken(), verifier = newToken(), nonce = newToken();
    const next = ["/", "/app", "/sell", "/account"].includes(url.searchParams.get("next") || "") ? url.searchParams.get("next")! : "/";
    await authDatabase().query("insert into shopora_auth.oauth_flows(state_hash,verifier,nonce,next_path,expires_at) values($1,$2,$3,$4,now()+interval '10 minutes')", [tokenHash(state), verifier, nonce, next]);
    const response = NextResponse.redirect(googleClient().generateAuthUrl({ scope: ["openid", "email", "profile"], state, nonce, code_challenge: pkceChallenge(verifier), code_challenge_method: "S256" as any, prompt: "select_account" }));
    response.cookies.set("shopora_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
    response.headers.set("Cache-Control", "no-store"); response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch { return Response.json({ error: "Google sign-in is unavailable. Please use email sign-in." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
