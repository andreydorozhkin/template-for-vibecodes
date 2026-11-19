import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function browserOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) {
    return new URL(request.url).origin;
  }
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", browserOrigin(request)), { status: 303 });
}
