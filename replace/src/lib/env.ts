export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}
export const OPENAI_BASE = () => (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
