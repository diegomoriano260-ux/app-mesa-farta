// Normaliza para comparar palavras-chave: minúsculas, sem acento, sem pontuação.
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\p{P}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseKeywords(raw: string): string[] {
  const out = raw.split(/[,\n;]/).map(normalize).filter(Boolean);
  return [...new Set(out)];
}

// contains: a palavra-chave aparece como palavra inteira ("quero" casa "Eu QUERO!", não "queroo").
// exact: o texto inteiro é a palavra-chave. Sem palavras-chave: casa qualquer texto.
export function matchesKeywords(text: string, keywords: string[], mode: "contains" | "exact"): boolean {
  if (keywords.length === 0) return true;
  const t = normalize(text);
  if (!t) return false;
  if (mode === "exact") return keywords.includes(t);
  const padded = ` ${t} `;
  return keywords.some((k) => padded.includes(` ${k} `));
}
