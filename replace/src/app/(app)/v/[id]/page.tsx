"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { deleteProject, getProject, recallFile, rememberFile, saveProject, type Project } from "@/lib/store";
import { renderClip } from "@/lib/ffmpeg";
import { fmtClock, toSrt, toTxt } from "@/lib/time";
import type { Analysis, Clip } from "@/lib/analysis";
import { IconCopy, IconDoc, IconDownload, IconPlay, IconScissors, IconTrash } from "@/components/icons";

function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const slug = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "video";

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="btn-secondary px-3 py-1.5 text-xs" onClick={async () => { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      <IconCopy className="h-3.5 w-3.5" />{ok ? "Copiado!" : label}
    </button>
  );
}

function ClipCard({ p, clip, i, file, onNeedFile }: { p: Project; clip: Clip; i: number; file: File | undefined; onNeedFile: () => void }) {
  const [state, setState] = useState<"idle" | "rendering" | "done" | "error">("idle");
  const [pct, setPct] = useState(0);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [captions, setCaptions] = useState(true);
  const preview = useRef<HTMLVideoElement>(null);
  const src = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  async function render() {
    if (!file) return onNeedFile();
    setState("rendering"); setPct(0); setErr("");
    try {
      const blob = await renderClip(file, p.segments, clip.inicio, clip.fim, { captions }, setPct);
      setOut(URL.createObjectURL(blob)); setState("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e)); setState("error");
    }
  }

  function playOriginal() {
    const v = preview.current;
    if (!v) return;
    v.currentTime = clip.inicio; v.play();
    const stop = () => { if (v.currentTime >= clip.fim) { v.pause(); v.removeEventListener("timeupdate", stop); } };
    v.addEventListener("timeupdate", stop);
  }

  return (
    <li className="card space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{clip.titulo}</p>
          <p className="mt-0.5 text-xs text-muted">{fmtClock(clip.inicio)} – {fmtClock(clip.fim)} · {Math.round(clip.fim - clip.inicio)}s · potencial {clip.nota}/10</p>
        </div>
      </div>
      <p className="rounded-xl bg-brand-50 p-3 text-sm italic text-brand-700">“{clip.gancho}”</p>
      <p className="text-sm text-muted">{clip.motivo}</p>

      {src && state !== "done" && (
        <div className="overflow-hidden rounded-xl bg-black">
          <video ref={preview} src={`${src}#t=${clip.inicio}`} className="max-h-64 w-full" controls playsInline preload="metadata" />
        </div>
      )}
      {out && (
        <div className="mx-auto w-48 overflow-hidden rounded-2xl bg-black shadow-lg">
          <video src={out} className="aspect-[9/16] w-full" controls playsInline />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {src && state !== "done" && <button className="btn-secondary px-3 py-2 text-sm" onClick={playOriginal}><IconPlay className="h-4 w-4" />Ouvir trecho</button>}
        {state !== "done" && (
          <button className="btn-primary px-3 py-2 text-sm" disabled={state === "rendering"} onClick={render}>
            <IconScissors className="h-4 w-4" />{state === "rendering" ? `Gerando... ${Math.round(pct * 100)}%` : "Gerar vídeo vertical"}
          </button>
        )}
        {state === "done" && out && (
          <a className="btn-primary px-3 py-2 text-sm" href={out} download={`${slug(clip.titulo)}.mp4`}><IconDownload className="h-4 w-4" />Baixar MP4</a>
        )}
        {state !== "rendering" && state !== "done" && (
          <label className="flex items-center gap-1.5 text-xs text-muted"><input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} />legenda no vídeo</label>
        )}
      </div>
      {state === "rendering" && <div className="h-1.5 overflow-hidden rounded-full bg-brand-50"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round(pct * 100)}%` }} /></div>}
      {state === "error" && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">Legenda para o post</summary>
        <p className="mt-2 whitespace-pre-wrap text-sm">{clip.legenda_post}</p>
        <div className="mt-2"><CopyButton text={clip.legenda_post} /></div>
      </details>
    </li>
  );
}

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<Project | null | undefined>(undefined);
  const [tab, setTab] = useState<"clipes" | "resumo" | "texto">("clipes");
  const [file, setFile] = useState<File | undefined>(undefined);
  const [q, setQ] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aErr, setAErr] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { getProject(id).then((x) => setP(x ?? null)); setFile(recallFile(id)); }, [id]);

  if (p === undefined) return <p className="text-sm text-muted">Carregando...</p>;
  if (p === null) return <div className="card text-center"><p>Vídeo não encontrado neste navegador.</p><Link href="/" className="btn-secondary mt-4">Voltar</Link></div>;

  const a = p.analysis;
  const filtered = q ? p.segments.filter((s) => s.text.toLowerCase().includes(q.toLowerCase())) : p.segments;
  const resumoTxt = a ? [a.resumo, "", "Tópicos:", ...a.topicos.map((t) => `${fmtClock(t.inicio)} ${t.titulo}`), "", "Pontos-chave:", ...a.pontos_chave.map((k) => `• ${k}`), ...(a.acoes.length ? ["", "Ações:", ...a.acoes.map((k) => `• ${k}`)] : [])].join("\n") : "";

  async function analyze() {
    if (!p) return;
    setAnalyzing(true); setAErr("");
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: p.title, duration: p.duration, segments: p.segments }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
      const np = { ...p, analysis: data as Analysis };
      await saveProject(np); setP(np);
    } catch (e) { setAErr(e instanceof Error ? e.message : String(e)); } finally { setAnalyzing(false); }
  }

  function pickFile(f: File | undefined) {
    if (!f || !p) return;
    if (f.size !== p.fileSize) { alert(`Esse não parece ser o mesmo arquivo (${p.fileName}).`); return; }
    rememberFile(p.id, f); setFile(f);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/" className="text-sm text-muted hover:text-ink">← Seus vídeos</Link>
          <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-tight">{p.title}</h1>
          <p className="text-sm text-muted">{fmtClock(p.duration)} · {p.fileName}</p>
        </div>
        <button className="btn-danger px-3 py-2 text-sm" onClick={async () => { if (confirm("Apagar este vídeo e a transcrição?")) { await deleteProject(p.id); router.push("/"); } }}>
          <IconTrash className="h-4 w-4" />Apagar
        </button>
      </div>

      <div className="inline-flex w-full rounded-xl bg-brand-50 p-1 sm:w-auto">
        {([["clipes", "Clipes", IconScissors], ["resumo", "Resumo", IconDoc], ["texto", "Transcrição", IconDoc]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium sm:flex-none ${tab === k ? "bg-white text-brand-700 shadow-sm" : "text-muted"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {!a && tab !== "texto" && (
        <div className="card text-center">
          <p className="font-semibold">A transcrição está pronta, mas a análise com IA ainda não.</p>
          {aErr && <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{aErr}</p>}
          <button className="btn-primary mt-4" disabled={analyzing} onClick={analyze}>{analyzing ? "Analisando... (1 a 2 min)" : "Gerar resumo e clipes"}</button>
        </div>
      )}

      {a && tab === "clipes" && (
        <>
          {!file && (
            <div className="card flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50">
              <p className="flex-1 text-sm text-amber-900">Para ver e gerar os clipes, escolha de novo o arquivo <b>{p.fileName}</b>. Ele não fica salvo no site.</p>
              <input ref={fileInput} type="file" accept="video/*,audio/*" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
              <button className="btn-primary px-3 py-2 text-sm" onClick={() => fileInput.current?.click()}>Escolher arquivo</button>
            </div>
          )}
          <ul className="grid gap-4 lg:grid-cols-2">
            {a.clipes.map((c, i) => <ClipCard key={i} p={p} clip={c} i={i} file={file} onNeedFile={() => fileInput.current?.click()} />)}
          </ul>
          <p className="text-center text-xs text-muted">O vídeo vertical é gerado no seu aparelho. Pode levar 1 a 3 minutos por clipe.</p>
        </>
      )}

      {a && tab === "resumo" && (
        <div className="card space-y-5">
          <div className="flex justify-end"><CopyButton text={resumoTxt} label="Copiar resumo" /></div>
          <p className="whitespace-pre-wrap leading-relaxed">{a.resumo}</p>
          <section>
            <h2 className="mb-2 font-bold">Tópicos</h2>
            <ul className="space-y-1.5">{a.topicos.map((t, i) => <li key={i} className="flex gap-3 text-sm"><span className="w-14 shrink-0 font-mono text-brand-600">{fmtClock(t.inicio)}</span>{t.titulo}</li>)}</ul>
          </section>
          <section>
            <h2 className="mb-2 font-bold">Pontos-chave</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">{a.pontos_chave.map((k, i) => <li key={i}>{k}</li>)}</ul>
          </section>
          {a.acoes.length > 0 && (
            <section>
              <h2 className="mb-2 font-bold">Ações e próximos passos</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">{a.acoes.map((k, i) => <li key={i}>{k}</li>)}</ul>
            </section>
          )}
        </div>
      )}

      {tab === "texto" && (
        <div className="card space-y-4">
          <div className="flex flex-wrap gap-2">
            <input className="input min-w-0 flex-1" placeholder="Buscar na transcrição..." value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-secondary px-3 text-sm" onClick={() => download(`${slug(p.title)}.txt`, new Blob([toTxt(p.segments)], { type: "text/plain" }))}><IconDownload className="h-4 w-4" />TXT</button>
            <button className="btn-secondary px-3 text-sm" onClick={() => download(`${slug(p.title)}.srt`, new Blob([toSrt(p.segments)], { type: "text/plain" }))}><IconDownload className="h-4 w-4" />SRT</button>
            <CopyButton text={toTxt(p.segments)} />
          </div>
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {filtered.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed"><span className="w-14 shrink-0 font-mono text-xs leading-6 text-brand-600">{fmtClock(s.start)}</span><span>{s.text}</span></li>
            ))}
            {filtered.length === 0 && <li className="text-sm text-muted">Nada encontrado.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
