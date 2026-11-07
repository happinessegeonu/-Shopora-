export function requireSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  const canonical = process.env.AUTH_APP_ORIGIN;
  const allowed = new Set(canonical ? [new URL(canonical).origin] : []);
  if (origin && allowed.has(origin)) return;
  // Native clients authenticate every mutation with a server-validated token.
  if (!origin && /^Bearer \S+$/i.test(request.headers.get("authorization") || "")) return;
  throw new Error("ORIGIN_REJECTED");
}
export class StoreError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
