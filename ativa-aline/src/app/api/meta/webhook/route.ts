import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";
import { verifySignature } from "@/lib/meta/signature";
import { parseWebhook } from "@/lib/meta/parse";
import { handleEvent } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verificação do webhook (quando você clica "Verificar e salvar" no painel da Meta).
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const token = p.get("hub.verify_token") ?? "";
  if (p.get("hub.mode") === "subscribe" && safeEqual(token, env("META_WEBHOOK_VERIFY_TOKEN"))) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const ok = verifySignature(raw, req.headers.get("x-hub-signature-256"), [
    process.env.META_APP_SECRET,
    process.env.IG_APP_SECRET,
  ]);
  if (!ok) return new Response("bad signature", { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const results: string[] = [];
  for (const ev of parseWebhook(body)) {
    // Erro de banco -> 500 e a Meta reenvia; o reenvio não duplica (inbound_events é único).
    results.push(await handleEvent(ev));
  }
  return NextResponse.json({ ok: true, results });
}
