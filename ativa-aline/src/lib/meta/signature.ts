import { hmacHex, safeEqual } from "../crypto";

// A Meta assina o corpo cru com o segredo do app (X-Hub-Signature-256: sha256=<hex>).
// No Instagram com login do Instagram o segredo pode ser o do app do Instagram,
// então aceitamos qualquer um dos segredos configurados.
export function verifySignature(rawBody: string, header: string | null, secrets: (string | undefined)[]): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const got = header.slice("sha256=".length);
  return secrets.filter((s): s is string => !!s).some((s) => safeEqual(hmacHex(s, rawBody), got));
}
