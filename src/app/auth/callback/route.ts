import { NextResponse } from "next/server";
export async function GET(request: Request) { return NextResponse.redirect(new URL("/account?mode=forgot&legacy=1", request.url)); }
