// Configuração de edição de um clipe (estilo CapCut) e geração do arquivo de legenda .ass.
import type { Segment } from "./time";

export type Aspect = "9:16" | "1:1" | "4:5" | "16:9";
export type Fit = "crop" | "blur";
export type CaptionStyle = "destaque" | "classico" | "caixa" | "neon";
export type CaptionPos = "baixo" | "meio" | "topo";
export type CaptionSize = "P" | "M" | "G";

export type Cue = { start: number; end: number; text: string };

export type EditSettings = {
  start: number;
  end: number;
  aspect: Aspect;
  fit: Fit;
  captions: boolean;
  style: CaptionStyle;
  pos: CaptionPos;
  size: CaptionSize;
  cues: Cue[] | null;      // legenda editada (tempos relativos ao início do clipe); null = automática
  title: string;           // texto fixo no topo ("" = sem)
  handle: string;          // @ no rodapé ("" = sem)
  originalVolume: number;  // 0..1
  musicVolume: number;     // 0..1
};

export const DIMS: Record<Aspect, [number, number]> = {
  "9:16": [720, 1280], "1:1": [720, 720], "4:5": [720, 900], "16:9": [1280, 720],
};

export function defaultSettings(start: number, end: number): EditSettings {
  return {
    start, end, aspect: "9:16", fit: "crop", captions: true, style: "destaque", pos: "baixo", size: "M",
    cues: null, title: "", handle: "", originalVolume: 1, musicVolume: 0.25,
  };
}

// Frases curtas (até N palavras) com o tempo dividido pelas palavras, relativas ao início do clipe.
export function autoCues(segments: Segment[], clipStart: number, clipEnd: number, maxWords = 4): Cue[] {
  const cues: Cue[] = [];
  for (const s of segments) {
    if (s.end <= clipStart || s.start >= clipEnd) continue;
    const words = s.text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const per = (s.end - s.start) / words.length;
    for (let i = 0; i < words.length; i += maxWords) {
      const a = s.start + i * per;
      const b = s.start + Math.min(words.length, i + maxWords) * per;
      if (b <= clipStart || a >= clipEnd) continue;
      cues.push({ start: round2(Math.max(a, clipStart) - clipStart), end: round2(Math.min(b, clipEnd) - clipStart), text: words.slice(i, i + maxWords).join(" ") });
    }
  }
  return cues;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function assTime(sec: number): string {
  const cs = Math.max(0, Math.round(sec * 100));
  const h = Math.floor(cs / 360000), m = Math.floor((cs % 360000) / 6000), s = Math.floor((cs % 6000) / 100), r = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(r).padStart(2, "0")}`;
}

const clean = (t: string) => t.replace(/[{}\\]/g, "").replace(/\s+/g, " ").trim();

// Cores ASS são &HAABBGGRR.
const STYLE: Record<CaptionStyle, { primary: string; secondary: string; outline: string; back: string; border: 1 | 3; outlineW: number; shadow: number }> = {
  destaque: { primary: "&H0000E5FF", secondary: "&H00FFFFFF", outline: "&H00000000", back: "&H64000000", border: 1, outlineW: 5, shadow: 2 },
  classico: { primary: "&H00FFFFFF", secondary: "&H00FFFFFF", outline: "&H00000000", back: "&H64000000", border: 1, outlineW: 4, shadow: 2 },
  caixa:    { primary: "&H00FFFFFF", secondary: "&H00FFFFFF", outline: "&H00000000", back: "&H00000000", border: 3, outlineW: 12, shadow: 0 },
  neon:     { primary: "&H00FFFFFF", secondary: "&H00FFFFFF", outline: "&H00F63BFF", back: "&H00F63BFF", border: 1, outlineW: 6, shadow: 4 },
};

export function buildAss(s: EditSettings, cues: Cue[]): string {
  const [W, H] = DIMS[s.aspect];
  const base = Math.round(Math.min(W, H) / 720 * 64);
  const size = Math.round(base * { P: 0.8, M: 1, G: 1.3 }[s.size]);
  const st = STYLE[s.style];
  const align = { baixo: 2, meio: 5, topo: 8 }[s.pos];
  const marginV = { baixo: Math.round(H * 0.22), meio: 0, topo: Math.round(H * 0.2) }[s.pos];
  const fmt = "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding";
  const dur = s.end - s.start;
  const lines: string[] = [];
  if (s.captions) {
    for (const c of cues) {
      const words = clean(c.text).toUpperCase().split(" ").filter(Boolean);
      if (!words.length) continue;
      let text = words.join(" ");
      if (s.style === "destaque") {
        // karaokê: cada palavra acende na sua vez (\k em centésimos de segundo)
        const per = Math.max(1, Math.round(((c.end - c.start) * 100) / words.length));
        text = words.map((w) => `{\\k${per}}${w}`).join(" ");
      }
      lines.push(`Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Leg,,0,0,0,,${text}`);
    }
  }
  if (s.title.trim()) lines.push(`Dialogue: 1,${assTime(0)},${assTime(dur)},Titulo,,0,0,0,,${clean(s.title)}`);
  if (s.handle.trim()) lines.push(`Dialogue: 1,${assTime(0)},${assTime(dur)},Marca,,0,0,0,,${clean(s.handle)}`);
  return [
    "[Script Info]", "ScriptType: v4.00+", `PlayResX: ${W}`, `PlayResY: ${H}`, "WrapStyle: 0", "",
    "[V4+ Styles]", fmt,
    `Style: Leg,Inter ExtraBold,${size},${st.primary},${st.secondary},${st.outline},${st.back},-1,0,0,0,100,100,0,0,${st.border},${st.outlineW},${st.shadow},${align},50,50,${marginV},1`,
    `Style: Titulo,Inter ExtraBold,${Math.round(base * 0.85)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,3,14,0,8,50,50,${Math.round(H * 0.07)},1`,
    `Style: Marca,Inter ExtraBold,${Math.round(base * 0.5)},&H40FFFFFF,&H40FFFFFF,&H80000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,0,2,50,50,${Math.round(H * 0.04)},1`,
    "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...lines, "",
  ].join("\n");
}

// Filtro de vídeo do ffmpeg para o formato e o enquadramento escolhidos.
export function videoFilter(s: EditSettings, withSubs: boolean): string {
  const [W, H] = DIMS[s.aspect];
  const subs = withSubs ? ",subtitles=/legenda.ass:fontsdir=/fonts" : "";
  if (s.fit === "crop") {
    return `[0:v]crop='min(iw,ih*${W}/${H})':'min(ih,iw*${H}/${W})',scale=${W}:${H},setsar=1${subs}[v]`;
  }
  return `[0:v]split[a][b];[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=20:2[bg];` +
    `[b]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1${subs}[v]`;
}

export function audioFilter(s: EditSettings, hasMusic: boolean): string {
  const ov = s.originalVolume.toFixed(2);
  if (!hasMusic) return `[0:a]volume=${ov}[a]`;
  return `[0:a]volume=${ov}[a0];[1:a]volume=${s.musicVolume.toFixed(2)}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[a]`;
}
