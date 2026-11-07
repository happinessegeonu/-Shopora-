import { OAuth2Client } from "google-auth-library";
import { createHash, timingSafeEqual } from "node:crypto";
import { appOrigin } from "./http";
import { AuthError } from "./service";
export function googleClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) throw new AuthError("Google sign-in has not been configured. Please use email sign-in.", 503);
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, `${appOrigin()}/api/owned-auth/google/callback`);
}
export const pkceChallenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");
export function sameSecret(a: string, b: string) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export function googleClaims(claims: { sub?: string; email?: string; email_verified?: boolean; nonce?: string }, nonce: string) {
  if (!claims.sub || !claims.email || claims.email_verified !== true || !claims.nonce || !sameSecret(claims.nonce, nonce)) throw new AuthError("Google sign-in could not be verified.", 401);
  return { subject: claims.sub, email: claims.email };
}
