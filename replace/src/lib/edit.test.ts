import { describe, expect, it } from "vitest";
import { autoCues, audioFilter, buildAss, defaultSettings, videoFilter } from "./edit";

describe("editor", () => {
  const segs = [{ start: 10, end: 18, text: "um dois tres quatro cinco seis sete oito" }];
  it("legenda automática relativa ao clipe", () => {
    const cues = autoCues(segs, 12, 20);
    expect(cues[0].start).toBe(0);
    expect(cues.map((c) => c.text)).toEqual(["um dois tres quatro", "cinco seis sete oito"]);
  });
  it("estilo destaque gera karaokê palavra por palavra", () => {
    const s = defaultSettings(12, 20);
    const ass = buildAss(s, [{ start: 0, end: 2, text: "olá mundo" }]);
    expect(ass).toContain("{\\k100}OLÁ {\\k100}MUNDO");
    expect(ass).toContain("PlayResY: 1280");
  });
  it("título, marca e formato 1:1", () => {
    const s = { ...defaultSettings(0, 10), aspect: "1:1" as const, style: "caixa" as const, title: "Gancho {x}", handle: "@aline" };
    const ass = buildAss(s, []);
    expect(ass).toContain("PlayResY: 720");
    expect(ass).toContain("Titulo,,0,0,0,,Gancho x");
    expect(ass).toContain("Marca,,0,0,0,,@aline");
  });
  it("filtros de vídeo e áudio", () => {
    const s = defaultSettings(0, 10);
    expect(videoFilter(s, true)).toContain("subtitles=/legenda.ass");
    expect(videoFilter({ ...s, fit: "blur" }, false)).toContain("boxblur");
    expect(audioFilter(s, true)).toContain("amix=inputs=2");
    expect(audioFilter({ ...s, originalVolume: 0 }, false)).toBe("[0:a]volume=0.00[a]");
  });
});
