import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { client, readTranscript, sendApiError } from './_shared.js';

const Summary = z.object({
  title: z.string().describe('título curto da reunião'),
  summary: z.string().describe('resumo em um parágrafo: objetivo, o que foi discutido e o resultado'),
  topics: z.array(z.object({
    title: z.string(),
    start: z.number().describe('segundo em que o tópico começa'),
    points: z.array(z.string()).describe('pontos principais, uma frase cada'),
  })),
  decisions: z.array(z.string()).describe('decisões tomadas; vazio se nenhuma'),
  action_items: z.array(z.object({
    task: z.string(),
    owner: z.string().describe('quem ficou responsável, ou string vazia se não foi dito'),
    due: z.string().describe('prazo mencionado, ou string vazia se não foi dito'),
  })).describe('tarefas combinadas; vazio se nenhuma'),
});

export default async function handler(req, res) {
  const input = readTranscript(req, res);
  if (!input) return;
  const { transcript, duration } = input;

  try {
    const msg = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(Summary) },
      system:
        `Você resume reuniões. Recebe a transcrição automática de uma reunião de ${Math.round(duration / 60)} min, ` +
        'com cada linha marcada por [início-fim] em segundos; ela não identifica quem fala e pode ter erros de reconhecimento. ' +
        'Escreva no idioma da reunião. Seja fiel ao que foi dito: não invente decisões, nomes, prazos ou números. ' +
        'Só registre como decisão o que foi de fato decidido, e como tarefa o que alguém se comprometeu a fazer. ' +
        'Organize os tópicos na ordem em que aparecem.',
      messages: [{ role: 'user', content: transcript }],
    });
    if (msg.stop_reason === 'refusal') return res.status(422).json({ error: 'O modelo recusou analisar este conteúdo.' });
    if (!msg.parsed_output) return res.status(502).json({ error: `Resposta incompleta (${msg.stop_reason}).` });
    return res.status(200).json(msg.parsed_output);
  } catch (err) {
    return sendApiError(err, res);
  }
}
