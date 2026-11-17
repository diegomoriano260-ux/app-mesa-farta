"use client";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import type { Segment } from "./time";
import { audioFilter, autoCues, buildAss, defaultSettings, videoFilter, type Cue, type EditSettings } from "./edit";

declare global {
  interface Window { FFmpegWASM?: { FFmpeg: new () => FFmpeg } }
}

// Carrega /ffmpeg/ffmpeg.js (UMD) uma vez; ele cria window.FFmpegWASM.
function loadScript(): Promise<void> {
  if (window.FFmpegWASM) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/ffmpeg/ffmpeg.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Não consegui carregar o editor de vídeo."));
    document.head.appendChild(s);
  });
}

let instance: Promise<FFmpeg> | null = null;

// Carrega o ffmpeg (WebAssembly) servido pelo próprio site.
export function getFFmpeg(onLog?: (line: string) => void): Promise<FFmpeg> {
  if (!instance) {
    instance = (async () => {
      await loadScript();
      const ff = new window.FFmpegWASM!.FFmpeg();
      await ff.load({ coreURL: "/ffmpeg/ffmpeg-core.js", wasmURL: "/ffmpeg/ffmpeg-core.wasm" });
      return ff;
    })().catch((e) => { instance = null; throw e; });
  }
  return instance.then((ff) => {
    if (onLog) ff.on("log", ({ message }) => onLog(message));
    return ff;
  });
}

let mountSeq = 0;
// Monta o arquivo sem copiar para a memória (WORKERFS), para aguentar vídeos grandes.
async function mountInput(ff: FFmpeg, file: File): Promise<{ path: string; dir: string }> {
  const dir = `/in${++mountSeq}`;
  await ff.createDir(dir);
  await ff.mount("WORKERFS" as Parameters<FFmpeg["mount"]>[0], { files: [file] }, dir);
  return { path: `${dir}/${file.name}`, dir };
}

async function cleanup(ff: FFmpeg, dir: string) {
  try { await ff.unmount(dir); await ff.deleteDir(dir); } catch { /* já limpo */ }
}

// Separa o áudio em partes de 10 minutos (mp3 mono 24 kbps, ~1,8 MB cada).
export async function extractAudioChunks(file: File, onProgress: (p: number) => void): Promise<{ offset: number; blob: Blob }[]> {
  const ff = await getFFmpeg();
  const progress = ({ progress }: { progress: number }) => onProgress(Math.max(0, Math.min(1, progress)));
  ff.on("progress", progress);
  const { path, dir } = await mountInput(ff, file);
  const SEG = 600;
  try {
    await ff.createDir("/aud").catch(() => {});
    const code = await ff.exec(["-i", path, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "24k",
      "-f", "segment", "-segment_time", String(SEG), "-reset_timestamps", "1", "/aud/p%03d.mp3"]);
    if (code !== 0) throw new Error("Não consegui ler o áudio deste arquivo. Ele tem som?");
    const names = (await ff.listDir("/aud")).filter((n) => !n.isDir && n.name.endsWith(".mp3")).map((n) => n.name).sort();
    const out: { offset: number; blob: Blob }[] = [];
    for (const [i, name] of names.entries()) {
      const data = (await ff.readFile(`/aud/${name}`)) as Uint8Array;
      out.push({ offset: i * SEG, blob: new Blob([data.slice()], { type: "audio/mpeg" }) });
      await ff.deleteFile(`/aud/${name}`);
    }
    return out;
  } finally {
    ff.off("progress", progress);
    await cleanup(ff, dir);
  }
}

let fontLoaded = false;
async function ensureFont(ff: FFmpeg) {
  if (fontLoaded) return;
  await ff.createDir("/fonts").catch(() => {});
  const font = new Uint8Array(await (await fetch("/fonts/Inter-ExtraBold.otf")).arrayBuffer());
  await ff.writeFile("/fonts/Inter-ExtraBold.otf", font);
  fontLoaded = true;
}

// Gera o clipe editado: formato, enquadramento, legenda animada, título, @, música.
export async function renderEdited(
  file: File, settings: EditSettings, cues: Cue[], music: File | null, onProgress: (p: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const progress = ({ progress }: { progress: number }) => onProgress(Math.max(0, Math.min(1, progress)));
  ff.on("progress", progress);
  const { path, dir } = await mountInput(ff, file);
  const dur = (settings.end - settings.start).toFixed(2);
  const subs = settings.captions || !!settings.title.trim() || !!settings.handle.trim();
  try {
    if (subs) {
      await ensureFont(ff);
      await ff.writeFile("/legenda.ass", new TextEncoder().encode(buildAss(settings, cues)));
    }
    const inputs = ["-ss", settings.start.toFixed(2), "-t", dur, "-i", path];
    if (music) {
      await ff.writeFile("/musica", new Uint8Array(await music.arrayBuffer()));
      inputs.push("-stream_loop", "-1", "-i", "/musica");
    }
    const crf = settings.quality === "4k" ? "20" : settings.quality === "1080" ? "21" : "23";
    const enc = ["-c:v", "libx264", "-preset", "ultrafast", "-crf", crf, "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-t", dur, "-y", "/clipe.mp4"];
    let code = await ff.exec([...inputs, "-filter_complex", `${videoFilter(settings, subs)};${audioFilter(settings, !!music)}`,
      "-map", "[v]", "-map", "[a]", "-c:a", "aac", "-b:a", "128k", ...enc]);
    if (code !== 0) {
      // vídeo sem som: gera só a imagem (com a música, se houver)
      const audio = music ? ["-filter_complex", `${videoFilter(settings, subs)};[1:a]volume=${settings.musicVolume.toFixed(2)}[a]`, "-map", "[v]", "-map", "[a]", "-c:a", "aac"]
        : ["-filter_complex", videoFilter(settings, subs), "-map", "[v]", "-an"];
      code = await ff.exec([...inputs, ...audio, ...enc]);
    }
    if (code !== 0) throw new Error("Não consegui gerar o clipe.");
    const data = (await ff.readFile("/clipe.mp4")) as Uint8Array;
    await ff.deleteFile("/clipe.mp4");
    if (music) await ff.deleteFile("/musica").catch(() => {});
    return new Blob([data.slice()], { type: "video/mp4" });
  } finally {
    ff.off("progress", progress);
    await cleanup(ff, dir);
  }
}

// Atalho com as configurações padrão (vertical, legenda destaque).
export function renderClip(file: File, segments: Segment[], start: number, end: number, opts: { captions: boolean }, onProgress: (p: number) => void) {
  const s = { ...defaultSettings(start, end), captions: opts.captions };
  return renderEdited(file, s, autoCues(segments, start, end), null, onProgress);
}

export function videoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
    v.onerror = () => reject(new Error("Não consegui abrir esse arquivo de vídeo."));
    v.src = URL.createObjectURL(file);
  });
}
