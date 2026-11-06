export function authReturnPath(value: string | undefined) {
  let path = "/";
  try { path = decodeURIComponent(value || "/"); } catch { return "/"; }
  return ["/", "/sell", "/app", "/auth/reset-password"].includes(path) ? path : "/";
}
