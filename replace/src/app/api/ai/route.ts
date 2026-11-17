import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { payOrFail } from "@/lib/guard";
import { PRICES } from "@/lib/pricing";
import { transcriptForModel } from "@/lib/analysis";
import { TEMPLATES } from "@/lib/templates";

export const runtime = "nodejs";
export const maxDuration = 300;

const Seg = z.object({ start: z.number(), end: z.number(), text: z.string() });
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ask"), title: z.string(), segments: z.array(Seg).min(1),
    history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(20), question: z.string().min(1).max(2000) }),
  z.object({ action: z.literal("template"), title: z.string(), segments: z.array(Seg).min(1), templateId: z.string() }),
  z.object({ action: z.literal("moments"), title: z.string(), segments: z.array(Seg).min(1), query: z.string().min(1).max(500) }),
  z.object({ action: z.literal("translate"), language: z.string().min(2).max(40), segments: z.array(Seg).min(1).max(200) }),
]);

const Moments = z.object({ momentos: z.array(z.object({
  inicio: z.number().describe("Segundo de início, igual ao início de um trecho da transcrição."),
  fim: z.number().describe("Segundo de fim, igual ao fim de um trecho da transcrição."),
  descricao: z.string().describe("O que acontece nesse momento, em uma frase."),
})).describe("Momentos que correspondem ao pedido, em ordem de tempo. Vazio se nenhum.") });

const Translation = z.object({ textos: z.array(z.string()).describe("Um texto traduzido para cada trecho, na mesma ordem e quantidade.") });

const BASE = "Você trabalha com a transcrição de um vídeo e escreve em português do Brasil, a não ser que peçam outro idioma. " +
  "Cada linha da transcrição começa com [início-fim] em segundos. Seja fiel ao que foi dito; não invente informação.";

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const b = parsed.data;
  const label = { ask: "Pergunta ao vídeo", template: "Modelo pronto", moments: "Encontrar momentos", translate: "Tradução de legendas" }[b.action];
  const pay = await payOrFail(b.action === "translate" ? PRICES.traducaoPorLote : PRICES.ia, label);
  if ("error" in pay) return pay.error;
  const client = new Anthropic();
  const common = { model: "claude-opus-5-5", max_tokens: 16000, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

  try {
    if (b.action === "ask" || b.action === "template") {
      const transcript = `Vídeo: ${b.title}\n\nTranscrição:\n${transcriptForModel(b.segments)}`;
      const system = [
        { type: "text" as const, text: BASE + " Ao citar uma parte do vídeo, indique o minuto no formato (m:ss). Use markdown simples (títulos, listas, negrito)." },
        { type: "text" as const, text: transcript, cache_control: { type: "ephemeral" as const } },
      ];
      const messages: Anthropic.Beta.BetaMessageParam[] = b.action === "ask"
        ? [...b.history.map((h) => ({ role: h.role, content: h.content })), { role: "user", content: b.question }]
        : [{ role: "user", content: TEMPLATES.find((t) => t.id === b.templateId)?.pedido ?? "Resuma o vídeo." }];
      const msg = await client.beta.messages.create({ ...common, output_config: { effort: "low" }, system, messages });
      if (msg.stop_reason === "refusal") { await pay.refund(); return NextResponse.json({ error: "A IA recusou este pedido." }, { status: 422 }); }
      const text = msg.content.flatMap((c) => (c.type === "text" ? [c.text] : [])).join("\n").trim();
      return NextResponse.json({ text });
    }

    if (b.action === "moments") {
      const msg = await client.beta.messages.parse({
        ...common, output_config: { effort: "low", format: betaZodOutputFormat(Moments) },
        system: BASE + " Encontre os momentos do vídeo que correspondem ao pedido.",
        messages: [{ role: "user", content: `Vídeo: ${b.title}\nPedido: ${b.query}\n\nTranscrição:\n${transcriptForModel(b.segments)}` }],
      });
      const out = msg.parsed_output;
      if (!out) { await pay.refund(); return NextResponse.json({ error: "A IA não devolveu os momentos." }, { status: 502 }); }
      return NextResponse.json(out);
    }

    const msg = await client.beta.messages.parse({
      ...common, output_config: { effort: "low", format: betaZodOutputFormat(Translation) },
      system: `Traduza cada trecho de legenda para ${b.language}. Mantenha o tom falado e frases curtas. Devolva exatamente um texto por trecho, na mesma ordem.`,
      messages: [{ role: "user", content: b.segments.map((s, i) => `${i + 1}. ${s.text}`).join("\n") }],
    });
    const out = msg.parsed_output;
    if (!out || out.textos.length !== b.segments.length) { await pay.refund(); return NextResponse.json({ error: "A tradução veio incompleta. Tente de novo." }, { status: 502 }); }
    return NextResponse.json({ segments: b.segments.map((s, i) => ({ ...s, text: out.textos[i] })) });
  } catch (e) {
    await pay.refund();
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "Chave da Anthropic inválida (ANTHROPIC_API_KEY)." }, { status: 500 });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Muitos pedidos seguidos. Espere um minuto." }, { status: 429 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: `Erro da IA (${e.status}): ${e.message.slice(0, 200)}` }, { status: 502 });
    throw e;
  }
}
