import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { authReturnPath } from "@/lib/auth-return";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = request.cookies.get("shopora_auth_next")?.value;
  const next = authReturnPath(requestedNext);
  const failure = next === "/auth/reset-password" ? "/?signin=1&reset=1&auth=error" : "/?signin=1&auth=error";
  if (code && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.delete("shopora_auth_next");
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: { getAll: () => request.cookies.getAll(), setAll: (cookies: Parameters<SetAllCookies>[0]) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) },
    });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(failure, origin));
    if (data && "redirectType" in data && data.redirectType === "recovery") response.headers.set("Location", new URL("/auth/reset-password", origin).toString());
    return response;
  }
  return NextResponse.redirect(new URL(failure, origin));
}
