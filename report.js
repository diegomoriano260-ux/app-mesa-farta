export function fmt(s) {
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

export const transcriptText = segments => segments.map(s => `[${fmt(s.start)}] ${s.text.trim()}`).join('\n');

export function summaryMarkdown(s) {
  const lines = [`# ${s.title}`, '', s.summary, '', '## Tópicos'];
  for (const t of s.topics) lines.push('', `### ${fmt(t.start)} · ${t.title}`, ...t.points.map(p => `- ${p}`));
  lines.push('', '## Decisões', ...(s.decisions.length ? s.decisions.map(d => `- ${d}`) : ['Nenhuma.']));
  lines.push('', '## Tarefas', ...(s.action_items.length
    ? s.action_items.map(a => `- [ ] ${a.task}${a.owner ? ` (${a.owner})` : ''}${a.due ? ` — prazo: ${a.due}` : ''}`)
    : ['Nenhuma.']));
  return lines.join('\n') + '\n';
}
