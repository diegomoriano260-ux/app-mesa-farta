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
    expect(audioFilter({ ...s, originalVolume: 0, audioClean: "off" }, false)).toBe("[0:a]volume=0.00[a]");
  });
});

import { cropFromCenter, maskFilter, cleanChain } from "./edit";
describe("enquadramento, tarjas e áudio", () => {
  it("quadro 9:16 manual dentro do vídeo 16:9", () => {
    const c = cropFromCenter("9:16", 1920, 1080, 0.85, 0.8, 2);
    expect(c.h).toBeCloseTo(0.5);
    expect(c.w * 1920 / (c.h * 1080)).toBeCloseTo(9 / 16);
    expect(c.x + c.w).toBeLessThanOrEqual(1);
    expect(c.y + c.h).toBeLessThanOrEqual(1);
  });
  it("filtro usa crop manual e tarjas", () => {
    const s = { ...defaultSettings(0, 10), crop: { x: 0.5, y: 0.5, w: 0.2, h: 0.4 }, maskTop: 0.1, maskBottom: 0.15 };
    const f = videoFilter(s, false);
    expect(f).toContain("drawbox=x=0:y=0:w=iw:h=ih*0.1000");
    expect(f).toContain("crop=iw*0.2000:ih*0.4000:iw*0.5000:ih*0.5000");
    expect(maskFilter({ ...s, maskTop: 0, maskBottom: 0 })).toBe("");
  });
  it("limpeza de áudio", () => {
    expect(cleanChain("off")).toBe("");
    expect(cleanChain("forte")).toContain("afftdn");
    expect(audioFilter(defaultSettings(0, 1), false)).toContain("loudnorm");
  });
});
