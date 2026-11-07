import { cookies } from "next/headers";
import { authDatabase } from "./database";
import { COOKIE_NAME, OwnedAuth } from "./service";
import { appOrigin } from "./http";

export function ownedAuth() {
  if (process.env.OWNED_AUTH_ENABLED !== "true") throw new Error("Owned authentication is not enabled.");
  return new OwnedAuth(authDatabase(), async (email, purpose, token) => {
    const { MAILGUN_API_KEY: key, MAILGUN_DOMAIN: domain, MAILGUN_FROM_EMAIL: from } = process.env;
    if (!key || !domain || !from) throw new Error("Email delivery is not configured.");
    // Fragments keep bearer secrets out of request URLs, access logs and referrers.
    const link = `${appOrigin()}/account#${new URLSearchParams({ purpose, token })}`;
    const message = new FormData();
    message.set("from", from); message.set("to", email);
    message.set("subject", purpose === "verify" ? "Set up your Shopora account" : "Reset your Shopora password");
    message.set("text", `Open this link to ${purpose === "verify" ? "verify your email and choose your password" : "choose a new password"}:\n\n${link}\n\nThis link expires in 30 minutes and works once. If you did not request this, ignore this email.`);
    const base = process.env.MAILGUN_REGION?.toUpperCase() === "EU" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
    const response = await fetch(`${base}/v3/${encodeURIComponent(domain)}/messages`, { method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`api:${key}`).toString("base64")}` },
      body: message, signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!response.ok) throw new Error("Email delivery failed.");
  }, process.env.AUTH_RATE_SECRET || "");
}
// Use this on server routes/pages; never accept user_id or email from the browser
// as evidence of identity. Ownership checks still belong in each data operation.
export async function currentOwnedUser() {
  return ownedAuth().session((await cookies()).get(COOKIE_NAME)?.value);
}
export async function requestOwnedToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization) return authorization.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (request.headers.get("x-shopora-native") === "1") return undefined;
  return (await cookies()).get(COOKIE_NAME)?.value;
}
