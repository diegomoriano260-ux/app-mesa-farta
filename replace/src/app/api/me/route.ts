import { NextResponse } from "next/server";
import { currentUser, saasMode } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  return NextResponse.json({ email: u.email, is_admin: u.is_admin, balance_cents: u.balance_cents, saas: saasMode() });
}
