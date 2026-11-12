import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { decrypt, encrypt, safeEqual } from "@/lib/crypto";
import { refreshToken } from "@/lib/meta/instagram";

export const dynamic = "force-dynamic";

// Vercel Cron chama 1x por dia (vercel.json). Renova tokens que vencem em menos de 10 dias.
export async function GET(req: Request) {
  if (!safeEqual(req.headers.get("authorization") ?? "", `Bearer ${env("CRON_SECRET")}`)) {
    return new Response("unauthorized", { status: 401 });
  }
  const sql = db();
  const due = await sql<{ id: string; access_token_enc: string }[]>`
    select id, access_token_enc from channels
    where kind = 'instagram' and status in ('connected','error')
      and token_expires_at < now() + interval '10 days'`;
  const result = { renewed: 0, failed: 0 };
  for (const c of due) {
    try {
      const r = await refreshToken(decrypt(c.access_token_enc));
      await sql`update channels set access_token_enc = ${encrypt(r.token)}, token_expires_at = ${r.expiresAt},
                status = 'connected', last_error = null where id = ${c.id}`;
      result.renewed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sql`update channels set
                  status = case when token_expires_at < now() then 'token_expired' else 'error' end,
                  last_error = ${msg} where id = ${c.id}`;
      result.failed++;
    }
  }
  return NextResponse.json(result);
}
