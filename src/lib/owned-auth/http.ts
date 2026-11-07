import { AuthError } from "./service";
export function appOrigin() {
  const value = process.env.AUTH_APP_ORIGIN;
  if (!value) throw new Error("AUTH_APP_ORIGIN is required.");
  const url = new URL(value);
  const localPreview = process.env.SHOPORA_PREVIEW === "true" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.origin !== value || (url.protocol !== "https:" && !localPreview && !(process.env.NODE_ENV !== "production" && url.hostname === "localhost"))) throw new Error("Use an exact HTTPS origin (localhost HTTP is allowed in development).");
  return url.origin;
}
export function checkOrigin(request: Request) {
  const native = !request.headers.has("origin") && request.headers.get("x-shopora-native") === "1";
  if (!native && request.headers.get("origin") !== appOrigin()) throw new AuthError("Request origin is not allowed.", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new AuthError("Send JSON.", 415);
}
export async function readBody(request: Request, maxBytes = 4096): Promise<Record<string, unknown>> {
  if (!request.body) throw new AuthError("Missing request body.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new AuthError("Request is too large.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw new AuthError("Send a valid JSON object."); }
}
