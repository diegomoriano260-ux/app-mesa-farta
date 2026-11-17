"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { extractAudioChunks, getFFmpeg, videoDuration } from "@/lib/ffmpeg";
import { rememberFile, saveProject, type Project } from "@/lib/store";
import { mergeChunks, type Segment } from "@/lib/time";
import type { Analysis } from "@/lib/analysis";
import { IconCheck, IconVideo } from "@/components/icons";

type Step = "ffmpeg" | "audio" | "transcribe" | "analyze" | "done";
const STEPS: { id: Step; label: string }[] = [
  { id: "ffmpeg", label: "Preparando o editor" },
  { id: "audio", label: "Separando o áudio" },
  { id: "transcribe", label: "Transcrevendo" },
  { id: "analyze", label: "Resumo e clipes com IA" },
];

async function postJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Erro ${res.status}`);
  return data as T;
}

export default function Novo() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [step, setStep] = useState<Step | null>(null);
  const [pct, setPct] = useState(0);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busy = step !== null && step !== "done" && !error;

  async function start() {
    if (!file) return;
    setError(null);
    try {
      const id = crypto.randomUUID();
      const duration = await videoDuration(file);
      setStep("ffmpeg"); setPct(0); setDetail("só na primeira vez, ~30 MB");
      await getFFmpeg();

      setStep("audio"); setDetail("");
      const chunks = await extractAudioChunks(file, (p) => setPct(p));

      setStep("transcribe");
      const parts: { offset: number; segments: Segment[] }[] = [];
      let language: string | null = null;
      for (const [i, c] of chunks.entries()) {
        setDetail(`parte ${i + 1} de ${chunks.length}`); setPct(i / chunks.length);
        const fd = new FormData();
        fd.append("file", c.blob, `p${i}.mp3`);
        fd.append("offset", String(c.offset));
        const r = await postJson<{ segments: Segment[]; language: string | null }>("/api/transcribe", { method: "POST", body: fd });
        parts.push({ offset: c.offset, segments: r.segments });
        language ??= r.language;
      }
      const segments = mergeChunks(parts);
      if (!segments.length) throw new Error("Não encontrei fala neste vídeo.");

      const project: Project = {
        id, title: title.trim() || file.name.replace(/\.[^.]+$/, ""), fileName: file.name, fileSize: file.size,
        duration, createdAt: Date.now(), language, segments, analysis: null,
      };
      await saveProject(project); // a transcrição já fica salva, mesmo se a análise falhar
      rememberFile(id, file);

      setStep("analyze"); setDetail("pode levar 1 ou 2 minutos"); setPct(0);
      const analysis = await postJson<Analysis>("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: project.title, duration, segments }),
      });
      await saveProject({ ...project, analysis });
      setStep("done");
      router.push(`/v/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const idx = step ? STEPS.findIndex((s) => s.id === step) : -1;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-[26px] font-bold tracking-tight">Novo vídeo</h1>
      <div className="card space-y-4">
        <label className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${file ? "border-brand-400 bg-brand-50" : "border-line hover:border-brand-200"} ${busy ? "pointer-events-none opacity-60" : ""}`}>
          <input type="file" accept="video/*,audio/*" className="sr-only" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); setStep(null); setError(null); }} />
          <IconVideo className="mb-3 h-8 w-8 text-brand-600" />
          {file ? (
            <><p className="font-semibold">{file.name}</p><p className="text-xs text-muted">{(file.size / 1048576).toFixed(0)} MB · toque para trocar</p></>
          ) : (
            <><p className="font-semibold">Escolher vídeo ou áudio</p><p className="text-xs text-muted">Live, aula, podcast, reunião. O vídeo não sai do seu aparelho; só o áudio vai para a transcrição.</p></>
          )}
        </label>
        <div>
          <label className="label" htmlFor="title">Título (opcional)</label>
          <input id="title" className="input" value={title} disabled={busy} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Live sobre introdução alimentar" />
        </div>
        <button className="btn-primary w-full py-3 text-base" disabled={!file || busy} onClick={start}>
          {busy ? "Processando..." : "Transcrever e criar clipes"}
        </button>
      </div>

      {step && (
        <div className="card mt-4 space-y-3">
          {STEPS.map((s, i) => {
            const done = i < idx || step === "done";
            const now = i === idx && step !== "done";
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-green-100 text-green-700" : now ? (error ? "bg-red-100 text-red-700" : "bg-brand-600 text-white") : "bg-neutral-100 text-muted"}`}>
                  {done ? <IconCheck className="h-4 w-4" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${now ? "font-semibold" : done ? "" : "text-muted"}`}>{s.label}{now && detail ? <span className="font-normal text-muted"> · {detail}</span> : null}</p>
                  {now && !error && (s.id === "audio" || s.id === "transcribe") && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-50"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round(pct * 100)}%` }} /></div>
                  )}
                  {now && !error && (s.id === "ffmpeg" || s.id === "analyze") && <div className="mt-1.5 h-1.5 animate-pulse rounded-full bg-brand-100" />}
                </div>
              </div>
            );
          })}
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {error && <button className="btn-secondary w-full" onClick={start}>Tentar de novo</button>}
          {busy && <p className="text-center text-xs text-muted">Deixe esta aba aberta até terminar.</p>}
        </div>
      )}
    </div>
  );
}
