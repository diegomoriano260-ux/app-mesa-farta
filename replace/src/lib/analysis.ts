import { z } from "zod";

// O que o Claude devolve sobre o vídeo.
export const AnalysisSchema = z.object({
  resumo: z.string().describe("Resumo do vídeo em 3 a 6 frases, em português do Brasil."),
  topicos: z.array(z.object({
    titulo: z.string(),
    inicio: z.number().describe("Segundo em que o tópico começa (use o início de um trecho da transcrição)."),
  })).describe("Capítulos do vídeo, em ordem."),
  pontos_chave: z.array(z.string()).describe("Ideias principais, uma frase cada."),
  acoes: z.array(z.string()).describe("Tarefas ou próximos passos citados. Vazio se não houver."),
  clipes: z.array(z.object({
    titulo: z.string().describe("Título curto e chamativo para o Reels."),
    gancho: z.string().describe("A primeira frase do clipe, que prende a atenção."),
    inicio: z.number().describe("Segundo de início, igual ao início de um trecho da transcrição."),
    fim: z.number().describe("Segundo de fim, igual ao fim de um trecho da transcrição."),
    motivo: z.string().describe("Por que esse trecho tem potencial de viralizar."),
    nota: z.number().describe("Potencial de viralizar, de 1 a 10."),
    legenda_post: z.string().describe("Texto para postar junto, com 3 a 5 hashtags."),
  })).describe("Os melhores trechos para clipes curtos, do melhor para o pior."),
});
export type Analysis = z.infer<typeof AnalysisSchema>;
export type Clip = Analysis["clipes"][number];

export type SegmentLite = { start: number; end: number; text: string };

export function transcriptForModel(segments: SegmentLite[]): string {
  return segments.map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`).join("\n");
}

// Corrige o que vier fora do lugar: dentro do vídeo, duração entre 10 e 90 s, sem repetidos.
export function sanitizeClips(clips: Clip[], duration: number): Clip[] {
  const out: Clip[] = [];
  for (const c of clips) {
    let inicio = Math.max(0, Math.min(c.inicio, duration));
    let fim = Math.max(0, Math.min(c.fim, duration));
    if (fim < inicio) [inicio, fim] = [fim, inicio];
    if (fim - inicio < 10) fim = Math.min(duration, inicio + 15);
    if (fim - inicio > 90) fim = inicio + 90;
    if (fim - inicio < 5) continue;
    if (out.some((o) => Math.abs(o.inicio - inicio) < 3)) continue;
    out.push({ ...c, inicio, fim, nota: Math.max(1, Math.min(10, Math.round(c.nota))) });
  }
  return out;
}
