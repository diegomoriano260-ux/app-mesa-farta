// Tabela de preços do Replace (em centavos de real). Custos de referência ao lado.
export const PRICES = {
  transcricaoPorMinuto: 10,   // R$0,10/min   (OpenAI ~US$0,006/min ≈ R$0,03)
  analise: 100,               // R$1,00/vídeo (Claude ~R$0,20–0,60)
  ia: 20,                     // R$0,20 por pergunta, modelo pronto ou busca de momentos
  traducaoPorLote: 30,        // R$0,30 a cada 150 frases traduzidas
  upscale1080Por5s: 100,      // R$1,00 a cada 5 s  (Topaz ~US$0,093 ≈ R$0,51)
  upscale4kPor5s: 350,        // R$3,50 a cada 5 s  (Topaz ~US$0,373 ≈ R$2,05)
} as const;

export const SIGNUP_BONUS = 500; // R$5,00 grátis para testar

export const PACKS = [
  { id: "p20", nome: "Inicial", price: 2000, credit: 2000, destaque: "" },
  { id: "p50", nome: "Criador", price: 5000, credit: 5500, destaque: "+10% de bônus" },
  { id: "p100", nome: "Profissional", price: 10000, credit: 12000, destaque: "+20% de bônus" },
] as const;
export type PackId = (typeof PACKS)[number]["id"];

export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function upscaleCost(seconds: number, res: "1080p" | "4k"): number {
  const blocks = Math.max(1, Math.ceil(seconds / 5));
  return blocks * (res === "4k" ? PRICES.upscale4kPor5s : PRICES.upscale1080Por5s);
}

// Duração aproximada de um mp3 de 24 kbps pelo tamanho do arquivo.
export function mp3Seconds(bytes: number): number {
  return (bytes * 8) / 24000;
}

export function transcriptionCost(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60)) * PRICES.transcricaoPorMinuto;
}
