// Shared by the /api routes (Vercel skips files starting with _ as routes).
import Anthropic from '@anthropic-ai/sdk';

export const client = new Anthropic();
const MAX_CHARS = 400_000; // ~2 h of speech: keeps one request's cost bounded

// Checks method, access code and the transcript body; sends the error itself and returns null when invalid.
export function readTranscript(req, res) {
  if (req.method !== 'POST') return void res.status(405).json({ error: 'Use POST' });
  if (process.env.ACCESS_CODE && req.headers['x-access-code'] !== process.env.ACCESS_CODE) {
    return void res.status(401).json({ error: 'Código de acesso inválido.' });
  }
  const { segments, duration } = req.body ?? {};
  const valid = Array.isArray(segments) && segments.length > 0 && Number.isFinite(duration) &&
    segments.every(s => Number.isFinite(s.start) && Number.isFinite(s.end) && typeof s.text === 'string');
  if (!valid) return void res.status(400).json({ error: 'Envie segments [{start,end,text}] e duration.' });
  const transcript = segments.map(s => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text.trim()}`).join('\n');
  if (transcript.length > MAX_CHARS) return void res.status(413).json({ error: 'Transcrição longa demais (máx. ~2 h).' });
  return { transcript, duration, body: req.body };
}

export function sendApiError(err, res) {
  if (err instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: 'ANTHROPIC_API_KEY ausente ou inválida no servidor.' });
  if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'Limite de uso da API atingido; tente de novo em instantes.' });
  if (err instanceof Anthropic.APIError) return res.status(502).json({ error: `Erro da API (${err.status}): ${err.message}` });
  throw err;
}
