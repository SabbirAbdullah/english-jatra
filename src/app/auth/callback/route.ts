import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  if (code) { const sb = await createClient(); const { error } = await sb.auth.exchangeCodeForSession(code); if (error) return NextResponse.redirect(new URL("/login?error=link", req.url)); }
  return NextResponse.redirect(new URL(next.startsWith("/") && !next.startsWith("//") ? next : "/", req.url));
}
