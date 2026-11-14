import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { client, readTranscript, sendApiError } from './_shared.js';

const Clips = z.object({
  clips: z.array(z.object({
    start: z.number().describe('segundo de início'),
    end: z.number().describe('segundo de fim'),
    title: z.string().describe('título curto e chamativo, no idioma do vídeo'),
    reason: z.string().describe('por que esse trecho prende a atenção, em uma frase'),
  })),
});

export function clampClips(clips, duration) {
  return clips
    .map(c => ({ ...c, start: Math.max(0, c.start), end: Math.min(duration, c.end) }))
    .filter(c => c.end - c.start >= 5);
}

export default async function handler(req, res) {
  const input = readTranscript(req, res);
  if (!input) return;
  const { transcript, duration, body } = input;
  const n = Math.min(Math.max(parseInt(body.count, 10) || 3, 1), 10);

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
    return sendApiError(err, res);
  }
}
