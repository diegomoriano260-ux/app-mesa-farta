import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const Clips = z.object({
  clips: z.array(z.object({
    start: z.number().describe('segundo de início'),
    end: z.number().describe('segundo de fim'),
    title: z.string().describe('título curto e chamativo, no idioma do vídeo'),
    reason: z.string().describe('por que esse trecho prende a atenção, em uma frase'),
  })),
});

const client = new Anthropic();
const MAX_CHARS = 400_000; // ~2 h of speech: keeps one request's cost bounded

export function clampClips(clips, duration) {
  return clips
    .map(c => ({ ...c, start: Math.max(0, c.start), end: Math.min(duration, c.end) }))
    .filter(c => c.end - c.start >= 5);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  if (process.env.ACCESS_CODE && req.headers['x-access-code'] !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: 'Código de acesso inválido.' });
  }

  const { segments, duration, count = 3 } = req.body ?? {};
  const valid = Array.isArray(segments) && segments.length > 0 && Number.isFinite(duration) &&
    segments.every(s => Number.isFinite(s.start) && Number.isFinite(s.end) && typeof s.text === 'string');
  if (!valid) return res.status(400).json({ error: 'Envie segments [{start,end,text}] e duration.' });
  const n = Math.min(Math.max(parseInt(count, 10) || 3, 1), 10);

  const transcript = segments.map(s => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text.trim()}`).join('\n');
  if (transcript.length > MAX_CHARS) return res.status(413).json({ error: 'Transcrição longa demais (máx. ~2 h).' });

  try {
    const msg = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(Clips) },
      system:
        `Você é editor de vídeos curtos (Reels, TikTok, Shorts). Recebe a transcrição de um vídeo de ${duration.toFixed(0)} s, ` +
        `com cada linha marcada por [início-fim] em segundos. Escolha os ${n} melhores trechos para virar cortes independentes: ` +
        'cada um deve fazer sentido sozinho, abrir com um gancho forte nos primeiros segundos e terminar numa ideia completa, ' +
        'sem cortar frases ao meio. Duração ideal de 20 a 60 s, nunca mais de 90 s. Use apenas tempos que existem na transcrição. ' +
        'Os trechos não devem se sobrepor. Ordene do melhor para o pior.',
      messages: [{ role: 'user', content: transcript }],
    });
    if (msg.stop_reason === 'refusal') return res.status(422).json({ error: 'O modelo recusou analisar este conteúdo.' });
    if (!msg.parsed_output) return res.status(502).json({ error: `Resposta incompleta (${msg.stop_reason}).` });
    return res.status(200).json({ clips: clampClips(msg.parsed_output.clips, duration).slice(0, n) });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: 'ANTHROPIC_API_KEY ausente ou inválida no servidor.' });
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'Limite de uso da API atingido; tente de novo em instantes.' });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ error: `Erro da API (${err.status}): ${err.message}` });
    throw err;
  }
}
