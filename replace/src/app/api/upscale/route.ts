import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasSession } from "@/lib/session";
import { env } from "@/lib/env";

export const runtime = "nodejs";

// Super-resolução por IA: Topaz Video Upscale no Replicate.
const BASE = () => (process.env.REPLICATE_BASE_URL || "https://api.replicate.com").replace(/\/+$/, "");
const headers = () => ({ Authorization: `Bearer ${env("REPLICATE_API_TOKEN")}`, "Content-Type": "application/json" });

const Body = z.object({
  videoUrl: z.string().url(),
  resolution: z.enum(["1080p", "4k"]),
  fps: z.union([z.literal(30), z.literal(60)]).default(30),
});

function friendly(status: number, text: string): string {
  if (status === 401) return "Chave do Replicate inválida (REPLICATE_API_TOKEN).";
  if (status === 402) return "Sem crédito no Replicate. Coloque crédito em replicate.com/account/billing.";
  return `Erro no Replicate (${status}): ${text.slice(0, 200)}`;
}

export async function POST(req: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  if (!process.env.REPLICATE_API_TOKEN) return NextResponse.json({ error: "Falta configurar a chave do Replicate (REPLICATE_API_TOKEN) na Vercel." }, { status: 500 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const { videoUrl, resolution, fps } = parsed.data;
  const res = await fetch(`${BASE()}/v1/models/topazlabs/video-upscale/predictions`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ input: { video: videoUrl, target_resolution: resolution, target_fps: fps } }),
  });
  const text = await res.text();
  if (!res.ok) return NextResponse.json({ error: friendly(res.status, text) }, { status: 502 });
  const p = JSON.parse(text) as { id: string; status: string };
  return NextResponse.json({ id: p.id, status: p.status });
}

export async function GET(req: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  const u = new URL(req.url);
  const id = u.searchParams.get("id") ?? "";
  const blobUrl = u.searchParams.get("blob");
  if (!/^[a-z0-9]+$/i.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const res = await fetch(`${BASE()}/v1/predictions/${id}`, { headers: headers(), cache: "no-store" });
  const text = await res.text();
  if (!res.ok) return NextResponse.json({ error: friendly(res.status, text) }, { status: 502 });
  const p = JSON.parse(text) as { status: string; output?: string | string[] | null; error?: string | null };
  const done = ["succeeded", "failed", "canceled"].includes(p.status);
  // terminou: apaga o clipe enviado (só servia de entrada para a IA)
  if (done && blobUrl && process.env.BLOB_READ_WRITE_TOKEN) await del(blobUrl).catch(() => {});
  const output = Array.isArray(p.output) ? p.output[0] : p.output ?? null;
  return NextResponse.json({ status: p.status, output, error: p.error ?? null });
}
