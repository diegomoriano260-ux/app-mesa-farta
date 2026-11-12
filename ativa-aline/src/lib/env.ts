// Lê variáveis de ambiente na hora do uso (não no import), para o build não quebrar.
export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

export function envOpt(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const GRAPH_VERSION = () => envOpt("GRAPH_VERSION", "v24.0");
export const IG_GRAPH = () => envOpt("GRAPH_IG_BASE", "https://graph.instagram.com");
export const FB_GRAPH = () => envOpt("GRAPH_FB_BASE", "https://graph.facebook.com");
export const IG_OAUTH = () => envOpt("IG_OAUTH_BASE", "https://api.instagram.com");
export const appUrl = () => env("APP_URL").replace(/\/+$/, "");
