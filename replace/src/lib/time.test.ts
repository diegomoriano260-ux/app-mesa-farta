import { describe, expect, it } from "vitest";
import { captionCues, fmtClock, mergeChunks, toAss, toSrt, toTxt } from "./time";

describe("tempo e legendas", () => {
  it("formata relógio", () => {
    expect(fmtClock(65)).toBe("1:05");
    expect(fmtClock(3725)).toBe("1:02:05");
  });
  it("junta partes com offset e ordena", () => {
    const m = mergeChunks([
      { offset: 600, segments: [{ start: 1, end: 2, text: " b " }] },
      { offset: 0, segments: [{ start: 1, end: 2, text: "a" }, { start: 3, end: 4, text: "  " }] },
    ]);
    expect(m).toEqual([{ start: 1, end: 2, text: "a" }, { start: 601, end: 602, text: "b" }]);
  });
  it("gera SRT e TXT", () => {
    const segs = [{ start: 0, end: 1.5, text: "Olá" }, { start: 61, end: 62, text: "Tchau" }];
    expect(toSrt(segs)).toContain("00:00:01,500");
    expect(toTxt(segs)).toBe("[0:00] Olá\n[1:01] Tchau");
  });
  it("legenda curta só dentro do clipe e relativa ao início", () => {
    const cues = captionCues([{ start: 10, end: 18, text: "um dois tres quatro cinco seis sete oito" }], 12, 20, 4);
    expect(cues[0].start).toBe(0);
    expect(cues.every((c) => c.start >= 0 && c.end <= 8)).toBe(true);
    expect(cues.map((c) => c.text)).toEqual(["um dois tres quatro", "cinco seis sete oito"]);
    expect(toAss(cues)).toContain("UM DOIS TRES QUATRO");
  });
});
