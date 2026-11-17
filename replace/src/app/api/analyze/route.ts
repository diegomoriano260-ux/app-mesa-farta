import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { payOrFail } from "@/lib/guard";
import { PRICES } from "@/lib/pricing";
import { AnalysisSchema, sanitizeClips, transcriptForModel } from "@/lib/analysis";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  title: z.string().max(200),
  duration: z.number().positive(),
  segments: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })).min(1),
});

const SYSTEM = `Você é editora de vídeos curtos para Instagram Reels e TikTok, e escreve em português do Brasil.
Recebe a transcrição de um vídeo longo, com o tempo de cada trecho em segundos no formato [início-fim].
Faça duas coisas:
1. Resuma o vídeo: resumo, capítulos (tópicos), pontos-chave e ações citadas.
2. Escolha de 3 a 10 trechos que funcionam sozinhos como clipes de 20 a 60 segundos: começam com uma frase forte,
   têm uma ideia completa e terminam no fim de uma frase. Use só tempos que existem na transcrição.
Seja fiel ao que foi dito; não invente informação.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Transcrição inválida." }, { status: 400 });
  const { title, duration, segments } = parsed.data;
  const pay = await payOrFail(PRICES.analise, `Resumo e clipes: ${title.slice(0, 60)}`);
  if ("error" in pay) return pay.error;

  const client = new Anthropic();
  try {
    const msg = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(AnalysisSchema) },
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Título do vídeo: ${title}\nDuração: ${Math.round(duration)} segundos\n\nTranscrição:\n${transcriptForModel(segments)}`,
      }],
    });
    if (msg.stop_reason === "refusal") {
      await pay.refund();
      return NextResponse.json({ error: "A IA recusou analisar este vídeo." }, { status: 422 });
    }
    const out = msg.parsed_output;
    if (!out) { await pay.refund(); return NextResponse.json({ error: "A IA não devolveu a análise. Tente de novo." }, { status: 502 }); }
    return NextResponse.json({ ...out, clipes: sanitizeClips(out.clipes, duration) });
  } catch (e) {
    await pay.refund();
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Chave da Anthropic inválida (ANTHROPIC_API_KEY)." }, { status: 500 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Muitas análises seguidas. Espere um minuto e tente de novo." }, { status: 429 });
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Erro da IA (${e.status}): ${e.message.slice(0, 200)}` }, { status: 502 });
    }
    throw e;
  }
}
