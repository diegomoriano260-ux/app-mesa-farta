import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/env";
import { db } from "@/lib/db";
import { encrypt, safeEqual } from "@/lib/crypto";
import { hasSession } from "@/lib/session";
import * as ig from "@/lib/meta/instagram";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const back = (q: string) => NextResponse.redirect(`${appUrl()}/canais?${q}`);
  if (!(await hasSession())) return NextResponse.redirect(`${appUrl()}/login`);

  const p = new URL(req.url).searchParams;
  const jar = await cookies();
  const expected = jar.get("ig_oauth_state")?.value ?? "";
  jar.delete("ig_oauth_state");
  if (p.get("error")) return back(`erro=${encodeURIComponent(p.get("error_description") ?? p.get("error")!)}`);
  if (!expected || !safeEqual(p.get("state") ?? "", expected)) return back("erro=sessao-expirada-tente-de-novo");
  const code = p.get("code");
  if (!code) return back("erro=sem-codigo");

  try {
    const { token, expiresAt } = await ig.exchangeCode(code, `${appUrl()}/api/auth/instagram/callback`);
    const me = await ig.getMe(token);
    await ig.subscribeWebhooks(token);
    await db()`
      insert into channels (kind, external_id, display_name, access_token_enc, token_expires_at, status, last_error)
      values ('instagram', ${String(me.user_id)}, ${"@" + me.username}, ${encrypt(token)}, ${expiresAt}, 'connected', null)
      on conflict (kind, external_id) do update set
        display_name = excluded.display_name, access_token_enc = excluded.access_token_enc,
        token_expires_at = excluded.token_expires_at, status = 'connected', last_error = null`;
  } catch (e) {
    console.error("[instagram oauth]", e);
    return back(`erro=${encodeURIComponent(e instanceof Error ? e.message.slice(0, 200) : "falha")}`);
  }
  return back("ok=1");
}
