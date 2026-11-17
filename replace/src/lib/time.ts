// Utilidades de tempo e formatos de legenda (usadas no navegador e nos testes).
export type Segment = { start: number; end: number; text: string };

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0"), rr = String(r).padStart(2, "0");
  return h ? `${h}:${mm}:${rr}` : `${mm}:${rr}`;
}

function srtTime(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(r).padStart(3, "0")}`;
}

export function toSrt(segments: Segment[]): string {
  return segments.map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text.trim()}\n`).join("\n");
}

export function toTxt(segments: Segment[]): string {
  return segments.map((s) => `[${fmtClock(s.start)}] ${s.text.trim()}`).join("\n");
}

// Junta as partes transcritas (cada parte começa no seu "offset" em segundos).
export function mergeChunks(chunks: { offset: number; segments: Segment[] }[]): Segment[] {
  return chunks
    .slice()
    .sort((a, b) => a.offset - b.offset)
    .flatMap((c) => c.segments.map((s) => ({ start: s.start + c.offset, end: s.end + c.offset, text: s.text.trim() })))
    .filter((s) => s.text.length > 0);
}

// Legenda estilo Reels: frases curtas (até N palavras), com o tempo dividido pelas palavras.
export function captionCues(segments: Segment[], clipStart: number, clipEnd: number, maxWords = 4): Segment[] {
  const cues: Segment[] = [];
  for (const s of segments) {
    if (s.end <= clipStart || s.start >= clipEnd) continue;
    const words = s.text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const per = (s.end - s.start) / words.length;
    for (let i = 0; i < words.length; i += maxWords) {
      const a = s.start + i * per;
      const b = s.start + Math.min(words.length, i + maxWords) * per;
      if (b <= clipStart || a >= clipEnd) continue;
      cues.push({ start: Math.max(a, clipStart) - clipStart, end: Math.min(b, clipEnd) - clipStart, text: words.slice(i, i + maxWords).join(" ") });
    }
  }
  return cues;
}

function assTime(sec: number): string {
  const cs = Math.max(0, Math.round(sec * 100));
  const h = Math.floor(cs / 360000), m = Math.floor((cs % 360000) / 6000), s = Math.floor((cs % 6000) / 100), r = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(r).padStart(2, "0")}`;
}

// Arquivo .ass para o ffmpeg queimar a legenda no vídeo vertical 720x1280.
export function toAss(cues: Segment[], highlight = "&H0000E5FF"): string {
  const esc = (t: string) => t.replace(/[{}\\]/g, "").replace(/\n/g, " ");
  return [
    "[Script Info]", "ScriptType: v4.00+", "PlayResX: 720", "PlayResY: 1280", "WrapStyle: 0", "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Reels,Inter ExtraBold,64,&H00FFFFFF,${highlight},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,5,2,2,60,60,300,1`,
    "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...cues.map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Reels,,0,0,0,,${esc(c.text).toUpperCase()}`),
    "",
  ].join("\n");
}
