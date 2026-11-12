import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/env";
import { randomToken } from "@/lib/crypto";
import { hasSession } from "@/lib/session";
import { authorizeUrl } from "@/lib/meta/instagram";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasSession())) return NextResponse.redirect(`${appUrl()}/login`);
  const state = randomToken();
  (await cookies()).set("ig_oauth_state", state, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600,
  });
  return NextResponse.redirect(authorizeUrl(`${appUrl()}/api/auth/instagram/callback`, state));
}
