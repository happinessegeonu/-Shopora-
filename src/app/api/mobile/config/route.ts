import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// These are the same PUBLIC credentials already delivered to website browsers.
// Never include a service-role key, Mailgun key, or other server credentials.
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Shopora is temporarily unavailable." }, { status: 503 });
  }
  return NextResponse.json({ supabaseUrl, supabaseAnonKey }, {
    headers: { "Cache-Control": "no-store" },
  });
}
