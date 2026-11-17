// Markdown simples (títulos, listas, negrito) para os textos da IA.
function inline(t: string, k: string) {
  const parts = t.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={`${k}-${i}`}>{p.slice(2, -2)}</strong> : <span key={`${k}-${i}`}>{p}</span>));
}

export function Markdown({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (i: number) => {
    if (list.length) out.push(<ul key={`l${i}`} className="my-2 list-disc space-y-1 pl-5">{list.map((li, j) => <li key={j}>{inline(li, `${i}-${j}`)}</li>)}</ul>);
    list = [];
  };
  text.split("\n").forEach((raw, i) => {
    const line = raw.trimEnd();
    const li = line.match(/^\s*(?:[-*•]|\d+[.)]|- \[ \])\s+(.*)$/);
    if (li) { list.push(li[1]); return; }
    flush(i);
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) out.push(<p key={i} className="mt-4 mb-1 font-bold">{inline(h[2], `${i}`)}</p>);
    else if (line.trim()) out.push(<p key={i} className="my-1.5">{inline(line, `${i}`)}</p>);
  });
  flush(-1);
  return <div className="text-[15px] leading-relaxed">{out}</div>;
}
