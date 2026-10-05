import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = request.cookies.get("shopora_auth_next")?.value;
  const decodedNext = requestedNext === "%2Fsell" ? "/sell" : requestedNext === "%2Fapp" ? "/app" : requestedNext;
  const next = decodedNext === "/sell" || decodedNext === "/app" ? decodedNext : "/";
  if (code && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.delete("shopora_auth_next");
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: { getAll: () => request.cookies.getAll(), setAll: (cookies: Parameters<SetAllCookies>[0]) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/?signin=1&auth=error", origin));
    return response;
  }
  return NextResponse.redirect(new URL("/?auth=error", origin));
}
