// Configuração de edição de um clipe (estilo CapCut) e geração do arquivo de legenda .ass.
import type { Segment } from "./time";

export type Aspect = "9:16" | "1:1" | "4:5" | "16:9";
export type Fit = "crop" | "blur";
export type CaptionStyle = "destaque" | "classico" | "caixa" | "neon";
export type CaptionPos = "baixo" | "meio" | "topo";
export type CaptionSize = "P" | "M" | "G";
export type AudioClean = "off" | "suave" | "forte";
export type Quality = "720" | "1080" | "4k";
// Área do vídeo original que aparece no clipe (frações de 0 a 1 da largura/altura).
export type CropBox = { x: number; y: number; w: number; h: number };

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
  crop?: CropBox | null;   // enquadramento manual; null = centro automático
  frame?: { cx: number; cy: number; zoom: number } | null; // ponto escolhido pela pessoa (para o quadro manual)
  maskTop?: number;        // tarja preta em cima do vídeo original (0..0.5)
  maskBottom?: number;     // tarja preta embaixo do vídeo original (0..0.5)
  audioClean?: AudioClean; // limpeza do áudio
  quality?: Quality;       // resolução de saída
  enhance?: boolean;       // melhorar imagem: tira granulação, dá nitidez, acerta contraste e cor
};

export const DIMS: Record<Aspect, [number, number]> = {
  "9:16": [720, 1280], "1:1": [720, 720], "4:5": [720, 900], "16:9": [1280, 720],
};

const SCALE: Record<Quality, number> = { "720": 1, "1080": 1.5, "4k": 3 };
// Dimensões finais do vídeo conforme formato e qualidade (sempre pares, exigência do H.264).
export function dimsOf(s: Pick<EditSettings, "aspect" | "quality">): [number, number] {
  const [w, h] = DIMS[s.aspect];
  const k = SCALE[s.quality ?? "720"];
  return [Math.round((w * k) / 2) * 2, Math.round((h * k) / 2) * 2];
}

export function defaultSettings(start: number, end: number): EditSettings {
  return {
    start, end, aspect: "9:16", fit: "crop", captions: true, style: "destaque", pos: "baixo", size: "M",
    cues: null, title: "", handle: "", originalVolume: 1, musicVolume: 0.25,
    crop: null, maskTop: 0, maskBottom: 0, audioClean: "suave", quality: "1080", enhance: true,
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
  const [W, H] = dimsOf(s);
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

const f4 = (n: number) => Math.max(0, Math.min(1, n)).toFixed(4);

// Tarjas pretas no vídeo original (escondem abas do navegador, barra do Meet, barra do Windows).
export function maskFilter(s: EditSettings): string {
  const parts: string[] = [];
  if ((s.maskTop ?? 0) > 0) parts.push(`drawbox=x=0:y=0:w=iw:h=ih*${f4(s.maskTop!)}:color=black:t=fill`);
  if ((s.maskBottom ?? 0) > 0) parts.push(`drawbox=x=0:y=ih*${f4(1 - s.maskBottom!)}:w=iw:h=ih*${f4(s.maskBottom!)}:color=black:t=fill`);
  return parts.length ? parts.join(",") + "," : "";
}

// Filtro de vídeo do ffmpeg para o formato e o enquadramento escolhidos.
export function videoFilter(s: EditSettings, withSubs: boolean): string {
  const [W, H] = dimsOf(s);
  const subs = withSubs ? ",subtitles=/legenda.ass:fontsdir=/fonts" : "";
  const denoise = s.enhance ? "hqdn3d=2:1.5:6:5," : "";
  const sharpen = s.enhance ? `,unsharp=5:5:${s.quality === "720" ? "0.6" : "0.9"}:3:3:0.3,eq=contrast=1.05:saturation=1.12:gamma=1.02` : "";
  const pre = `[0:v]${maskFilter(s)}${denoise}`;
  const scale = `scale=${W}:${H}:flags=lanczos`;
  if (s.crop) {
    const c = s.crop;
    return `${pre}crop=iw*${f4(c.w)}:ih*${f4(c.h)}:iw*${f4(c.x)}:ih*${f4(c.y)},${scale},setsar=1${sharpen}${subs}[v]`;
  }
  if (s.fit === "crop") {
    return `${pre}crop='min(iw,ih*${W}/${H})':'min(ih,iw*${H}/${W})',${scale},setsar=1${sharpen}${subs}[v]`;
  }
  return `${pre}split[a][b];[a]scale=${Math.round(W / 4)}:${Math.round(H / 4)}:force_original_aspect_ratio=increase,crop=${Math.round(W / 4)}:${Math.round(H / 4)},boxblur=10:2,scale=${W}:${H}[bg];` +
    `[b]scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1${sharpen}${subs}[v]`;
}

// Limpeza de voz: corta graves e zumbido, remove chiado, comprime e iguala o volume.
export function cleanChain(mode: AudioClean | undefined): string {
  if (mode === "suave") return "highpass=f=80,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5:LRA=11,";
  if (mode === "forte") return "highpass=f=100,lowpass=f=9000,afftdn=nf=-35:tn=1,acompressor=threshold=-22dB:ratio=3:attack=5:release=120,loudnorm=I=-16:TP=-1.5:LRA=9,";
  return "";
}

export function audioFilter(s: EditSettings, hasMusic: boolean): string {
  const ov = s.originalVolume.toFixed(2);
  const clean = cleanChain(s.audioClean);
  if (!hasMusic) return `[0:a]${clean}volume=${ov}[a]`;
  return `[0:a]${clean}volume=${ov}[a0];[1:a]volume=${s.musicVolume.toFixed(2)}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[a]`;
}

// Quadro de enquadramento manual: centro (cx, cy) e zoom (1 = maior quadro possível).
export function cropFromCenter(aspect: Aspect, srcW: number, srcH: number, cx: number, cy: number, zoom: number): CropBox {
  const [W, H] = DIMS[aspect];
  const target = W / H;
  let wPx = srcW, hPx = srcW / target;
  if (hPx > srcH) { hPx = srcH; wPx = srcH * target; }
  wPx /= zoom; hPx /= zoom;
  const w = wPx / srcW, h = hPx / srcH;
  const x = Math.max(0, Math.min(1 - w, cx - w / 2));
  const y = Math.max(0, Math.min(1 - h, cy - h / 2));
  return { x, y, w, h };
}
