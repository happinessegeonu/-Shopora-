// This switch is never enabled by the production deployment configuration.
export function isPreview() { return process.env.SHOPORA_PREVIEW === "true"; }
export function assertPreviewIsolation() {
  if (!isPreview()) throw new Error("Preview is disabled.");
  if ((process.env.SHOPORA_PREVIEW_ACCESS_CODE?.length || 0) < 20) throw new Error("Preview access is not configured.");
  const db = new URL(process.env.DATABASE_URL || "postgresql://invalid");
  if (db.protocol !== "postgresql:" || !["127.0.0.1", "localhost"].includes(db.hostname) || !db.port || db.search || db.hash || db.pathname !== "/postgres" || db.username !== "postgres" || process.env.AUTH_DATABASE_URL) throw new Error("Preview must use its isolated local test database.");
  const origin = new URL(process.env.AUTH_APP_ORIGIN || "http://invalid");
  if (["maketechlimited.com", "www.maketechlimited.com", "shopora-amber.vercel.app"].includes(origin.hostname)) throw new Error("A production origin cannot be used for the preview.");
}
export function isPreviewEmail(value: unknown) { return typeof value === "string" && /^[^\s<>@]+@example\.test$/i.test(value.trim()); }
