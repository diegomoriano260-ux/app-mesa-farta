"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteProject, getProject, recallFile, rememberFile, saveProject, type Project } from "@/lib/store";
import { renderClip } from "@/lib/ffmpeg";
import { fmtClock } from "@/lib/time";
import type { Analysis, Clip } from "@/lib/analysis";
import { AiTab } from "@/components/project/ai-tab";
import { TranslateTab } from "@/components/project/translate-tab";
import { TranscriptTab } from "@/components/project/transcript-tab";
import { api, CopyButton, slug } from "@/components/ui";
import { IconDoc, IconDownload, IconPlay, IconScissors, IconSparkles, IconTrash } from "@/components/icons";

type Tab = "clipes" | "resumo" | "texto" | "ia" | "traduzir";

function ClipCard({ p, clip, i, file, onNeedFile, playRange }: {
  p: Project; clip: Clip; i: number; file: File | undefined; onNeedFile: () => void; playRange: (a: number, b: number) => void;
}) {
  const [state, setState] = useState<"idle" | "rendering" | "done" | "error">("idle");
  const [pct, setPct] = useState(0);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function render() {
    if (!file) return onNeedFile();
    setState("rendering"); setPct(0); setErr("");
    try {
      const blob = await renderClip(file, p.segments, clip.inicio, clip.fim, { captions: true }, setPct);
      setOut(URL.createObjectURL(blob)); setState("done");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setState("error"); }
  }

  return (
    <li className="card space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{clip.titulo}</p>
          <p className="mt-0.5 text-xs text-muted">{fmtClock(clip.inicio)} – {fmtClock(clip.fim)} · {Math.round(clip.fim - clip.inicio)}s{clip.nota ? ` · potencial ${clip.nota}/10` : ""}</p>
        </div>
      </div>
      {clip.gancho && <p className="rounded-xl bg-brand-50 p-3 text-sm italic text-brand-700">“{clip.gancho}”</p>}
      {clip.motivo && <p className="text-sm text-muted">{clip.motivo}</p>}
      {out && <div className="mx-auto w-48 overflow-hidden rounded-2xl bg-black shadow-lg"><video src={out} className="aspect-[9/16] w-full" controls playsInline /></div>}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-secondary px-3 py-2 text-sm" onClick={() => (file ? playRange(clip.inicio, clip.fim) : onNeedFile())}><IconPlay className="h-4 w-4" />Ver trecho</button>
        <Link className="btn-primary px-3 py-2 text-sm" href={`/v/${p.id}/clipe/${i}`}><IconSparkles className="h-4 w-4" />Editar</Link>
        {state === "done" && out ? (
          <a className="btn-secondary px-3 py-2 text-sm" href={out} download={`${slug(clip.titulo)}.mp4`}><IconDownload className="h-4 w-4" />Baixar MP4</a>
        ) : (
          <button className="btn-secondary px-3 py-2 text-sm" disabled={state === "rendering"} onClick={render}>
            <IconScissors className="h-4 w-4" />{state === "rendering" ? `Gerando ${Math.round(pct * 100)}%` : "Gerar rápido"}
          </button>
        )}
      </div>
      {state === "rendering" && <div className="h-1.5 overflow-hidden rounded-full bg-brand-50"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round(pct * 100)}%` }} /></div>}
      {state === "error" && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {clip.legenda_post && (
        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold">Legenda para o post</summary>
          <p className="mt-2 whitespace-pre-wrap text-sm">{clip.legenda_post}</p>
          <div className="mt-2"><CopyButton text={clip.legenda_post} /></div>
        </details>
      )}
    </li>
  );
}

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<Project | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("clipes");
  const [file, setFile] = useState<File | undefined>(undefined);
  const [analyzing, setAnalyzing] = useState(false);
  const [aErr, setAErr] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const stopAt = useRef<number | null>(null);
  const src = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => { getProject(id).then((x) => setP(x ?? null)); setFile(recallFile(id)); }, [id]);

  const update = useCallback(async (patch: Partial<Project>) => {
    setP((cur) => {
      if (!cur) return cur;
      const np = { ...cur, ...patch };
      saveProject(np);
      return np;
    });
  }, []);

  if (p === undefined) return <p className="text-sm text-muted">Carregando...</p>;
  if (p === null) return <div className="card text-center"><p>Vídeo não encontrado neste navegador.</p><Link href="/" className="btn-secondary mt-4">Voltar</Link></div>;

  const a = p.analysis;
  const resumoTxt = a ? [a.resumo, "", "Tópicos:", ...a.topicos.map((t) => `${fmtClock(t.inicio)} ${t.titulo}`), "", "Pontos-chave:", ...a.pontos_chave.map((k) => `• ${k}`), ...(a.acoes.length ? ["", "Ações:", ...a.acoes.map((k) => `• ${k}`)] : [])].join("\n") : "";

  function seek(t: number, end?: number) {
    if (!file) { fileInput.current?.click(); return; }
    const v = player.current; if (!v) return;
    stopAt.current = end ?? null;
    v.currentTime = t; v.play(); v.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function makeClip(inicio: number, fim: number, titulo: string) {
    if (!p) return;
    const base: Analysis = a ?? { resumo: "", topicos: [], pontos_chave: [], acoes: [], clipes: [] };
    const clip: Clip = { titulo: titulo || "Clipe manual", gancho: "", inicio, fim: Math.min(fim, p.duration), motivo: "", nota: 0, legenda_post: "" };
    const analysis = { ...base, clipes: [...base.clipes, clip] };
    update({ analysis });
    router.push(`/v/${p.id}/clipe/${analysis.clipes.length - 1}`);
  }

  async function analyze() {
    if (!p) return;
    setAnalyzing(true); setAErr("");
    try {
      const data = await api<Analysis>("/api/analyze", { title: p.title, duration: p.duration, segments: p.segments });
      const manual = (p.analysis?.clipes ?? []).filter((c) => !c.nota);
      await update({ analysis: { ...data, clipes: [...data.clipes, ...manual] } });
    } catch (e) { setAErr(e instanceof Error ? e.message : String(e)); } finally { setAnalyzing(false); }
  }

  function pickFile(f: File | undefined) {
    if (!f || !p) return;
    if (f.size !== p.fileSize) { alert(`Esse não parece ser o mesmo arquivo (${p.fileName}).`); return; }
    rememberFile(p.id, f); setFile(f);
  }

  const tabs: [Tab, string][] = [["clipes", "Clipes"], ["resumo", "Resumo"], ["texto", "Transcrição"], ["ia", "IA"], ["traduzir", "Traduzir"]];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/" className="text-sm text-muted hover:text-ink">← Seus vídeos</Link>
          <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-tight">{p.title}</h1>
          <p className="text-sm text-muted">{fmtClock(p.duration)} · {p.fileName}</p>
        </div>
        <button className="btn-danger px-3 py-2 text-sm" onClick={async () => { if (confirm("Apagar este vídeo e tudo que foi gerado?")) { await deleteProject(p.id); router.push("/"); } }}>
          <IconTrash className="h-4 w-4" />Apagar
        </button>
      </div>

      <input ref={fileInput} type="file" accept="video/*,audio/*" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
      {src ? (
        <div className="overflow-hidden rounded-2xl bg-black">
          <video ref={player} src={src} className="max-h-[40vh] w-full" controls playsInline
            onTimeUpdate={(e) => { if (stopAt.current !== null && e.currentTarget.currentTime >= stopAt.current) { e.currentTarget.pause(); stopAt.current = null; } }} />
        </div>
      ) : (
        <div className="card flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50">
          <p className="flex-1 text-sm text-amber-900">Para assistir e gerar clipes, escolha de novo o arquivo <b>{p.fileName}</b>. Ele não fica salvo no site.</p>
          <button className="btn-primary px-3 py-2 text-sm" onClick={() => fileInput.current?.click()}>Escolher arquivo</button>
        </div>
      )}

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="inline-flex rounded-xl bg-brand-50 p-1">
          {tabs.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${tab === k ? "bg-white text-brand-700 shadow-sm" : "text-muted"}`}>{label}</button>
          ))}
        </div>
      </div>

      {!a && (tab === "clipes" || tab === "resumo") && (
        <div className="card text-center">
          <p className="font-semibold">A transcrição está pronta, mas o resumo e os clipes ainda não.</p>
          {aErr && <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{aErr}</p>}
          <button className="btn-primary mt-4" disabled={analyzing} onClick={analyze}>{analyzing ? "Analisando... (1 a 2 min)" : "Gerar resumo e clipes"}</button>
        </div>
      )}

      {a && tab === "clipes" && (
        <>
          <ul className="grid gap-4 lg:grid-cols-2">
            {a.clipes.map((c, i) => <ClipCard key={i} p={p} clip={c} i={i} file={file} onNeedFile={() => fileInput.current?.click()} playRange={(s, e) => seek(s, e)} />)}
          </ul>
          <div className="flex flex-wrap justify-center gap-2">
            <button className="btn-secondary text-sm" onClick={() => setTab("texto")}><IconScissors className="h-4 w-4" />Criar clipe pelo texto</button>
            <button className="btn-secondary text-sm" disabled={analyzing} onClick={analyze}><IconSparkles className="h-4 w-4" />{analyzing ? "Analisando..." : "Sugerir clipes de novo"}</button>
          </div>
        </>
      )}

      {a && tab === "resumo" && (
        <div className="card space-y-5">
          <div className="flex justify-end"><CopyButton text={resumoTxt} label="Copiar resumo" /></div>
          <p className="whitespace-pre-wrap leading-relaxed">{a.resumo}</p>
          <section>
            <h2 className="mb-2 font-bold">Capítulos</h2>
            <ul className="space-y-1.5">{a.topicos.map((t, i) => <li key={i}><button className="flex gap-3 text-left text-sm hover:text-brand-700" onClick={() => seek(t.inicio)}><span className="w-14 shrink-0 font-mono text-brand-600">{fmtClock(t.inicio)}</span>{t.titulo}</button></li>)}</ul>
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

      {tab === "texto" && <TranscriptTab p={p} seek={(t) => seek(t)} makeClip={makeClip} />}
      {tab === "ia" && <AiTab p={p} update={update} seek={(t) => seek(t)} makeClip={makeClip} />}
      {tab === "traduzir" && <TranslateTab p={p} update={update} />}
      <p className="pt-2 text-center text-xs text-muted"><IconDoc className="mr-1 inline h-3.5 w-3.5" />Tudo fica salvo neste navegador.</p>
    </div>
  );
}
