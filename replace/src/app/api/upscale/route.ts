import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, saasMode } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { payOrFail } from "@/lib/guard";
import { upscaleCost } from "@/lib/pricing";

export const runtime = "nodejs";

// Super-resolução por IA: Topaz Video Upscale no Replicate.
const BASE = () => (process.env.REPLICATE_BASE_URL || "https://api.replicate.com").replace(/\/+$/, "");
const headers = () => ({ Authorization: `Bearer ${env("REPLICATE_API_TOKEN")}`, "Content-Type": "application/json" });

const Body = z.object({
  videoUrl: z.string().url(),
  resolution: z.enum(["1080p", "4k"]),
  seconds: z.number().positive().max(600),
  fps: z.union([z.literal(30), z.literal(60)]).default(30),
});

function friendly(status: number, text: string): string {
  if (status === 401) return "O serviço de IA de vídeo está mal configurado. Avise o suporte.";
  if (status === 402) return "O serviço de IA de vídeo está sem crédito. Avise o suporte.";
  return `Erro no serviço de IA (${status}): ${text.slice(0, 200)}`;
}

export async function POST(req: Request) {
  if (!process.env.REPLICATE_API_TOKEN) return NextResponse.json({ error: "A super-resolução ainda não foi ativada neste app." }, { status: 503 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const { videoUrl, resolution, seconds, fps } = parsed.data;
  const tmp = `upscale-pendente:${crypto.randomUUID()}`;
  const pay = await payOrFail(upscaleCost(seconds, resolution), `Super-resolução ${resolution === "4k" ? "4K" : "1080p"} (${Math.round(seconds)}s)`, tmp);
  if ("error" in pay) return pay.error;
  const res = await fetch(`${BASE()}/v1/models/topazlabs/video-upscale/predictions`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ input: { video: videoUrl, target_resolution: resolution, target_fps: fps } }),
  });
  const text = await res.text();
  if (!res.ok) { await pay.refund(); return NextResponse.json({ error: friendly(res.status, text) }, { status: 502 }); }
  const p = JSON.parse(text) as { id: string; status: string };
  // marca o débito com o id da tarefa, para estornar se a IA falhar depois
  if (saasMode() && !pay.user.is_admin) await db()`update rp_ledger set ref = ${"upscale:" + p.id} where user_id = ${pay.user.id} and ref = ${tmp}`;
  return NextResponse.json({ id: p.id, status: p.status });
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  const u = new URL(req.url);
  const id = u.searchParams.get("id") ?? "";
  const blobUrl = u.searchParams.get("blob");
  if (!/^[a-z0-9]+$/i.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const res = await fetch(`${BASE()}/v1/predictions/${id}`, { headers: headers(), cache: "no-store" });
  const text = await res.text();
  if (!res.ok) return NextResponse.json({ error: friendly(res.status, text) }, { status: 502 });
  const p = JSON.parse(text) as { status: string; output?: string | string[] | null; error?: string | null };
  const done = ["succeeded", "failed", "canceled"].includes(p.status);
  if (done && blobUrl && process.env.BLOB_READ_WRITE_TOKEN) await del(blobUrl).catch(() => {});
  if ((p.status === "failed" || p.status === "canceled") && saasMode() && !user.is_admin) await refundJob(user.id, `upscale:${id}`);
  const output = Array.isArray(p.output) ? p.output[0] : p.output ?? null;
  return NextResponse.json({ status: p.status, output, error: p.error ?? null });
}

// Estorna uma única vez o débito ligado a esta tarefa.
async function refundJob(userId: string, ref: string) {
  await db().begin(async (tx) => {
    const [uso] = await tx<{ amount_cents: number }[]>`select amount_cents from rp_ledger where user_id = ${userId} and ref = ${ref} and kind = 'uso' for update`;
    if (!uso) return;
    const [ja] = await tx`select 1 from rp_ledger where user_id = ${userId} and ref = ${ref} and kind = 'estorno'`;
    if (ja) return;
    await tx`update rp_users set balance_cents = balance_cents + ${-uso.amount_cents} where id = ${userId}`;
    await tx`insert into rp_ledger (user_id, amount_cents, kind, description, ref) values (${userId}, ${-uso.amount_cents}, 'estorno', 'Estorno: super-resolução falhou', ${ref})`;
  });
}
