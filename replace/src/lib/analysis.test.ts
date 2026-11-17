import { describe, expect, it } from "vitest";
import { sanitizeClips, transcriptForModel } from "./analysis";

const base = { titulo: "t", gancho: "g", motivo: "m", legenda_post: "l", nota: 8 };
describe("sanitizeClips", () => {
  it("limita ao vídeo, corrige duração e remove repetidos", () => {
    const out = sanitizeClips([
      { ...base, inicio: 100, fim: 300 },        // > 90s -> corta
      { ...base, inicio: 101, fim: 130 },        // repetido
      { ...base, inicio: 50, fim: 52, nota: 12 },// curto -> 15s, nota max 10
      { ...base, inicio: 590, fim: 700 },        // passa do fim
    ], 600);
    expect(out.map((c) => [c.inicio, c.fim])).toEqual([[100, 190], [50, 65], [590, 600]]);
    expect(out[1].nota).toBe(10);
  });
});
describe("transcriptForModel", () => {
  it("marca o tempo de cada trecho", () => {
    expect(transcriptForModel([{ start: 1, end: 2.25, text: "oi" }])).toBe("[1.0-2.3] oi");
  });
});
