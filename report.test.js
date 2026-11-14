import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmt, summaryMarkdown, transcriptText } from './report.js';

test('fmt never shows 60 seconds', () => assert.equal(fmt(119.7), '1:59'));

test('transcript and summary export', () => {
  assert.equal(transcriptText([{ start: 65, end: 70, text: ' oi ' }]), '[1:05] oi');
  const md = summaryMarkdown({
    title: 'Planejamento', summary: 'Resumo.',
    topics: [{ title: 'Orçamento', start: 30, points: ['Cortar 10%'] }],
    decisions: [],
    action_items: [{ task: 'Enviar proposta', owner: 'Ana', due: 'sexta' }, { task: 'Revisar', owner: '', due: '' }],
  });
  assert.equal(md, [
    '# Planejamento', '', 'Resumo.', '', '## Tópicos', '', '### 0:30 · Orçamento', '- Cortar 10%',
    '', '## Decisões', 'Nenhuma.', '', '## Tarefas', '- [ ] Enviar proposta (Ana) — prazo: sexta', '- [ ] Revisar', '',
  ].join('\n'));
});
