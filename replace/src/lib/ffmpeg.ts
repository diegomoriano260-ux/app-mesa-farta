"use client";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { toAss, captionCues, type Segment } from "./time";

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
// Corta o trecho, deixa vertical 9:16 (720x1280) e queima a legenda estilo Reels.
export async function renderClip(
  file: File, segments: Segment[], start: number, end: number,
  opts: { captions: boolean }, onProgress: (p: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const progress = ({ progress }: { progress: number }) => onProgress(Math.max(0, Math.min(1, progress)));
  ff.on("progress", progress);
  const { path, dir } = await mountInput(ff, file);
  try {
    const vf = ["crop='min(iw,ih*9/16)':ih", "scale=720:1280:force_original_aspect_ratio=decrease",
      "pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black", "setsar=1"];
    if (opts.captions) {
      if (!fontLoaded) {
        await ff.createDir("/fonts").catch(() => {});
        const font = new Uint8Array(await (await fetch("/fonts/Inter-ExtraBold.otf")).arrayBuffer());
        await ff.writeFile("/fonts/Inter-ExtraBold.otf", font);
        fontLoaded = true;
      }
      await ff.writeFile("/legenda.ass", new TextEncoder().encode(toAss(captionCues(segments, start, end))));
      vf.push("subtitles=/legenda.ass:fontsdir=/fonts");
    }
    const code = await ff.exec(["-ss", start.toFixed(2), "-i", path, "-t", (end - start).toFixed(2), "-vf", vf.join(","),
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-y", "/clipe.mp4"]);
    if (code !== 0) throw new Error("Não consegui gerar o clipe.");
    const data = (await ff.readFile("/clipe.mp4")) as Uint8Array;
    await ff.deleteFile("/clipe.mp4");
    return new Blob([data.slice()], { type: "video/mp4" });
  } finally {
    ff.off("progress", progress);
    await cleanup(ff, dir);
  }
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
