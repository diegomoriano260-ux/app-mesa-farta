"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getProject, recallFile, rememberFile, saveProject, type Project } from "@/lib/store";
import { renderEdited } from "@/lib/ffmpeg";
import { autoCues, cropFromCenter, defaultSettings, DIMS, dimsOf, type Aspect, type Quality, type AudioClean, type CaptionPos, type CaptionSize, type CaptionStyle, type Cue, type EditSettings } from "@/lib/edit";
import { fmtClock } from "@/lib/time";
import { slug } from "@/components/ui";
import { UpscalePanel } from "@/components/upscale";
import { IconDownload, IconPlay, IconScissors } from "@/components/icons";

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${value === v ? "bg-brand-600 text-white" : "bg-canvas text-muted ring-1 ring-line"}`}>{l}</button>
      ))}
    </div>
  );
}

const STYLE_CSS: Record<CaptionStyle, React.CSSProperties> = {
  destaque: { color: "#fff", WebkitTextStroke: "1px #000", textShadow: "0 2px 0 #000, 0 0 6px #000" },
  classico: { color: "#fff", textShadow: "0 0 4px #000, 0 2px 2px #000" },
  caixa: { color: "#fff", background: "#000", padding: "2px 8px", borderRadius: 4 },
  neon: { color: "#fff", textShadow: "0 0 6px #ff3bf6, 0 0 12px #ff3bf6" },
};

export default function ClipEditor() {
  const { id, n } = useParams<{ id: string; n: string }>();
  const idx = Number(n);
  const [p, setP] = useState<Project | null>(null);
  const [file, setFile] = useState<File | undefined>(undefined);
  const [s, setS] = useState<EditSettings | null>(null);
  const [lang, setLang] = useState<string>("original");
  const [music, setMusic] = useState<File | null>(null);
  const [t, setT] = useState(0);
  const [src0, setSrc0] = useState<[number, number] | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"idle" | "rendering" | "done" | "error">("idle");
  const [pct, setPct] = useState(0);
  const [out, setOut] = useState<string | null>(null);
  const [outBlob, setOutBlob] = useState<Blob | null>(null);
  const [err, setErr] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const bg = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const src = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    getProject(id).then((x) => {
      if (!x) return;
      setP(x);
      const clip = x.analysis?.clipes[idx];
      if (!clip) return;
      const saved = x.edits?.[idx];
      if (saved) { setS(saved); return; }
      // reaproveita o visual de outro clipe já editado deste vídeo (enquadramento, tarjas, áudio, legenda)
      const other = Object.values(x.edits ?? {})[0];
      const base = defaultSettings(clip.inicio, clip.fim);
      setS(other ? { ...other, start: clip.inicio, end: clip.fim, cues: null, title: "" } : base);
    });
    setFile(recallFile(id));
  }, [id, idx]);

  // salva a edição automaticamente
  useEffect(() => {
    if (!p || !s) return;
    const timer = setTimeout(() => saveProject({ ...p, edits: { ...(p.edits ?? {}), [idx]: s } }), 400);
    return () => clearTimeout(timer);
  }, [p, s, idx]);

  const clip = p?.analysis?.clipes[idx];
  const segments = useMemo(() => (!p ? [] : lang === "original" ? p.segments : p.translations?.[lang] ?? p.segments), [p, lang]);
  const cues: Cue[] = useMemo(() => (s ? s.cues ?? autoCues(segments, s.start, s.end) : []), [s, segments]);

  if (!p || !clip || !s) return <p className="text-sm text-muted">Carregando...</p>;
  const set = (patch: Partial<EditSettings>) => { setS({ ...s, ...patch }); setState("idle"); };
  const [W, H] = DIMS[s.aspect];
  const rel = t - s.start;
  const cur = cues.find((c) => rel >= c.start && rel < c.end);
  const fontPx = { P: 15, M: 19, G: 24 }[s.size];
  const crop = s.crop ?? null;
  const zoomOf = () => s!.frame?.zoom ?? 2;
  function setCrop(cx: number, cy: number, zoom: number, aspect: Aspect = s!.aspect) {
    if (!src0) return;
    cx = Math.max(0, Math.min(1, cx)); cy = Math.max(0, Math.min(1, cy));
    set({ crop: cropFromCenter(aspect, src0[0], src0[1], cx, cy, zoom), frame: { cx, cy, zoom }, aspect });
  }
  function dragCrop(e: React.PointerEvent<HTMLDivElement>) {
    if (!crop || !frameRef.current || (e.type === "pointermove" && e.buttons !== 1)) return;
    const r = frameRef.current.getBoundingClientRect();
    setCrop((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, zoomOf());
  }
  const masks = (
    <>
      {(s.maskTop ?? 0) > 0 && <div className="absolute inset-x-0 top-0 bg-black" style={{ height: `${(s.maskTop ?? 0) * 100}%` }} />}
      {(s.maskBottom ?? 0) > 0 && <div className="absolute inset-x-0 bottom-0 bg-black" style={{ height: `${(s.maskBottom ?? 0) * 100}%` }} />}
    </>
  );

  function play() {
    const v = video.current; if (!v || !s) return;
    v.currentTime = s.start; v.play(); bg.current?.play();
  }

  async function exportar() {
    if (!file) return fileInput.current?.click();
    if (!s) return;
    setState("rendering"); setPct(0); setErr("");
    try {
      const blob = await renderEdited(file, s, cues, music, setPct);
      setOut(URL.createObjectURL(blob)); setOutBlob(blob); setState("done");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setState("error"); }
  }

  const maxEnd = p.duration;
  return (
    <div className="space-y-4 pb-24">
      <div>
        <Link href={`/v/${p.id}`} className="text-sm text-muted hover:text-ink">← {p.title}</Link>
        <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-tight">Editar: {clip.titulo}</h1>
      </div>
      <input ref={fileInput} type="file" accept="video/*,audio/*" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size === p.fileSize) { rememberFile(p.id, f); setFile(f); } else if (f) alert(`Escolha o arquivo ${p.fileName}.`); }} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-start">
        {/* Prévia */}
        <div className="space-y-3 lg:sticky lg:top-20">
          <div className="relative mx-auto overflow-hidden rounded-2xl bg-black shadow-lg" style={{ aspectRatio: `${W}/${H}`, maxHeight: "62vh", width: s.aspect === "16:9" ? "100%" : undefined, height: s.aspect === "16:9" ? undefined : "62vh" }}>
            {src ? (
              <>
                {s.fit === "blur" && !crop && <video ref={bg} src={src} muted playsInline className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl" onLoadedMetadata={(e) => { e.currentTarget.currentTime = video.current?.currentTime ?? s.start; }} />}
                <div className="absolute" style={crop
                  ? { width: `${100 / crop.w}%`, height: `${100 / crop.h}%`, left: `${(-crop.x / crop.w) * 100}%`, top: `${(-crop.y / crop.h) * 100}%` }
                  : { inset: 0 }}>
                <video ref={video} src={src} playsInline
                  style={s.enhance ? { filter: "contrast(1.05) saturate(1.12)" } : undefined}
                  className={`absolute inset-0 h-full w-full ${crop ? "object-fill" : s.fit === "crop" ? "object-cover" : "object-contain"}`}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget; setT(v.currentTime);
                    if (bg.current && Math.abs(bg.current.currentTime - v.currentTime) > 0.3) bg.current.currentTime = v.currentTime;
                    if (v.currentTime >= s.end) { v.pause(); bg.current?.pause(); }
                  }}
                  onLoadedMetadata={(e) => { e.currentTarget.currentTime = s.start; setSrc0([e.currentTarget.videoWidth, e.currentTarget.videoHeight]); }} />
                {crop && masks}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/80">
                Escolha o arquivo do vídeo para ver a prévia.
                <button className="btn-primary px-3 py-2 text-sm" onClick={() => fileInput.current?.click()}>Escolher arquivo</button>
              </div>
            )}
            {s.title && <div className="absolute inset-x-3 top-[6%] text-center"><span className="rounded bg-black px-2 py-1 text-[15px] font-black leading-tight text-white">{s.title}</span></div>}
            {s.captions && cur && (
              <div className="absolute inset-x-4 text-center font-black uppercase leading-tight"
                style={{ fontSize: fontPx, ...(s.pos === "baixo" ? { bottom: "20%" } : s.pos === "topo" ? { top: "20%" } : { top: "50%", transform: "translateY(-50%)" }) }}>
                <span style={STYLE_CSS[s.style]}>{cur.text}</span>
              </div>
            )}
            {s.handle && <div className="absolute inset-x-0 bottom-[3%] text-center text-[11px] font-bold text-white/70">{s.handle}</div>}
          </div>
          <div className="flex items-center justify-center gap-2">
            <button className="btn-secondary px-3 py-2 text-sm" onClick={play} disabled={!src}><IconPlay className="h-4 w-4" />Tocar</button>
            <span className="font-mono text-xs text-muted">{fmtClock(Math.max(0, t - s.start))} / {fmtClock(s.end - s.start)}</span>
          </div>
        </div>

        {/* Controles */}
        <div className="space-y-4">
          <section className="card space-y-3">
            <h2 className="font-bold">Corte</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Início (s)
                <input type="number" step="0.5" min={0} max={s.end - 1} className="input mt-1" value={s.start.toFixed(1)} onChange={(e) => set({ start: Math.max(0, Math.min(Number(e.target.value), s.end - 1)), cues: null })} />
              </label>
              <label className="text-sm">Fim (s)
                <input type="number" step="0.5" min={s.start + 1} max={maxEnd} className="input mt-1" value={s.end.toFixed(1)} onChange={(e) => set({ end: Math.min(maxEnd, Math.max(Number(e.target.value), s.start + 1)), cues: null })} />
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[-5, -1, 1, 5].map((d) => <button key={`s${d}`} className="chip" onClick={() => set({ start: Math.max(0, Math.min(s.start + d, s.end - 1)), cues: null })}>início {d > 0 ? "+" : ""}{d}s</button>)}
              {[-5, -1, 1, 5].map((d) => <button key={`e${d}`} className="chip" onClick={() => set({ end: Math.min(maxEnd, Math.max(s.end + d, s.start + 1)), cues: null })}>fim {d > 0 ? "+" : ""}{d}s</button>)}
            </div>
            <p className="text-xs text-muted">Duração: {Math.round(s.end - s.start)}s · Reels e TikTok: até 90s funciona melhor.</p>
          </section>

          <section className="card space-y-3">
            <h2 className="font-bold">Formato</h2>
            <Seg<Aspect> value={s.aspect} onChange={(v) => (crop ? setCrop(s.frame?.cx ?? 0.5, s.frame?.cy ?? 0.5, zoomOf(), v) : set({ aspect: v }))} options={[["9:16", "9:16 Reels"], ["4:5", "4:5 Feed"], ["1:1", "1:1 Quadrado"], ["16:9", "16:9 YouTube"]]} />
            <div className="flex flex-wrap gap-1.5">
              {([["auto", "Centro automático"], ["blur", "Inteiro + fundo desfocado"], ["manual", "Escolher a área (arrastar)"]] as const).map(([k, l]) => {
                const on = k === "manual" ? !!crop : !crop && (k === "blur" ? s.fit === "blur" : s.fit === "crop");
                return (
                  <button key={k} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${on ? "bg-brand-600 text-white" : "bg-canvas text-muted ring-1 ring-line"}`}
                    onClick={() => k === "manual" ? (src0 ? setCrop(s.frame?.cx ?? 0.5, s.frame?.cy ?? 0.5, s.frame?.zoom ?? 2) : fileInput.current?.click()) : set({ crop: null, frame: s.frame, fit: k === "blur" ? "blur" : "crop" })}>{l}</button>
                );
              })}
            </div>
            {crop && src && (
              <div className="space-y-2">
                <p className="text-xs text-muted">Arraste o quadro até a pessoa que deve aparecer. O que fica fora do quadro não entra no vídeo.</p>
                <div ref={frameRef} className="relative w-full touch-none select-none overflow-hidden rounded-xl bg-black"
                  style={{ aspectRatio: src0 ? `${src0[0]}/${src0[1]}` : "16/9" }}
                  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragCrop(e); }} onPointerMove={dragCrop}>
                  <video ref={thumb} src={src} muted playsInline className="absolute inset-0 h-full w-full object-fill"
                    onLoadedMetadata={(e) => { e.currentTarget.currentTime = s.start + 1; }} />
                  {masks}
                  <div className="pointer-events-none absolute rounded border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                    style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }} />
                </div>
                <label className="block text-sm">Zoom: {zoomOf().toFixed(1)}x
                  <input type="range" min={1} max={5} step={0.1} className="mt-1 w-full accent-brand-600" value={zoomOf()}
                    onChange={(e) => setCrop(s.frame?.cx ?? crop.x + crop.w / 2, s.frame?.cy ?? crop.y + crop.h / 2, Number(e.target.value))} />
                </label>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="text-sm">Tarja preta em cima: {Math.round((s.maskTop ?? 0) * 100)}%
                <input type="range" min={0} max={0.4} step={0.01} className="mt-1 w-full accent-brand-600" value={s.maskTop ?? 0} onChange={(e) => set({ maskTop: Number(e.target.value) })} />
              </label>
              <label className="text-sm">Tarja preta embaixo: {Math.round((s.maskBottom ?? 0) * 100)}%
                <input type="range" min={0} max={0.4} step={0.01} className="mt-1 w-full accent-brand-600" value={s.maskBottom ?? 0} onChange={(e) => set({ maskBottom: Number(e.target.value) })} />
              </label>
            </div>
            <p className="text-xs text-muted">As tarjas cobrem de preto as bordas do vídeo original: abas do navegador, barra do Meet, barra do Windows.</p>
          </section>

          <section className="card space-y-3">
            <h2 className="font-bold">Qualidade da imagem</h2>
            <Seg<Quality> value={s.quality ?? "720"} onChange={(v) => set({ quality: v })} options={[["720", "720p (rápido)"], ["1080", "1080p Full HD"], ["4k", "4K Ultra HD"]]} />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={!!s.enhance} onChange={(e) => set({ enhance: e.target.checked })} />
              <span><b>Melhorar imagem</b>: tira a granulação da webcam, dá nitidez e acerta contraste e cor.</span>
            </label>
            <p className="text-xs text-muted">A ampliação deixa a imagem lisa e nítida, mas não cria detalhes que a câmera não gravou. 4K gera um arquivo grande e demora mais (use no computador).</p>
          </section>

          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Legenda</h2>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.captions} onChange={(e) => set({ captions: e.target.checked })} />mostrar</label>
            </div>
            {s.captions && (
              <>
                <Seg<CaptionStyle> value={s.style} onChange={(v) => set({ style: v })} options={[["destaque", "Palavra por palavra"], ["classico", "Clássica"], ["caixa", "Caixa preta"], ["neon", "Neon"]]} />
                <Seg<CaptionPos> value={s.pos} onChange={(v) => set({ pos: v })} options={[["baixo", "Embaixo"], ["meio", "No meio"], ["topo", "Em cima"]]} />
                <Seg<CaptionSize> value={s.size} onChange={(v) => set({ size: v })} options={[["P", "Pequena"], ["M", "Média"], ["G", "Grande"]]} />
                {p.translations && Object.keys(p.translations).length > 0 && (
                  <label className="block text-sm">Idioma da legenda
                    <select className="input mt-1" value={lang} onChange={(e) => { setLang(e.target.value); set({ cues: null }); }}>
                      <option value="original">Original</option>
                      {Object.keys(p.translations).map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </label>
                )}
                <details className="rounded-xl border border-line p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Editar texto da legenda ({cues.length} frases)</summary>
                  <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                    {cues.map((c, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-12 shrink-0 font-mono text-[11px] text-muted">{fmtClock(c.start)}</span>
                        <input className="input py-1.5 text-sm" value={c.text}
                          onChange={(e) => set({ cues: cues.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                      </li>
                    ))}
                  </ul>
                  {s.cues && <button className="mt-2 text-xs text-muted underline" onClick={() => set({ cues: null })}>voltar para a legenda automática</button>}
                </details>
              </>
            )}
          </section>

          <section className="card space-y-3">
            <h2 className="font-bold">Textos fixos</h2>
            <label className="block text-sm">Título no topo (gancho)
              <input className="input mt-1" value={s.title} maxLength={60} onChange={(e) => set({ title: e.target.value })} placeholder={clip.gancho || "Ex.: O erro que toda mãe comete"} />
            </label>
            {clip.gancho && !s.title && <button className="chip" onClick={() => set({ title: clip.gancho })}>usar o gancho sugerido</button>}
            <label className="block text-sm">Seu @ no rodapé
              <input className="input mt-1" value={s.handle} maxLength={40} onChange={(e) => set({ handle: e.target.value })} placeholder="@aline.moriano.nutri" />
            </label>
          </section>

          <section className="card space-y-3">
            <h2 className="font-bold">Áudio</h2>
            <div className="space-y-1.5">
              <p className="text-sm">Melhorar a voz (tira chiado e iguala o volume)</p>
              <Seg<AudioClean> value={s.audioClean ?? "off"} onChange={(v) => set({ audioClean: v })} options={[["off", "Desligado"], ["suave", "Suave"], ["forte", "Forte (muito chiado)"]]} />
              <p className="text-xs text-muted">O efeito aparece no vídeo exportado.</p>
            </div>
            <label className="block text-sm">Volume do vídeo: {Math.round(s.originalVolume * 100)}%
              <input type="range" min={0} max={1.5} step={0.05} className="mt-1 w-full accent-brand-600" value={s.originalVolume} onChange={(e) => set({ originalVolume: Number(e.target.value) })} />
            </label>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="btn-secondary cursor-pointer px-3 py-2 text-sm">
                <input type="file" accept="audio/*" className="sr-only" onChange={(e) => { setMusic(e.target.files?.[0] ?? null); setState("idle"); }} />
                {music ? "Trocar música" : "Adicionar música de fundo"}
              </label>
              {music && <><span className="truncate text-muted">{music.name}</span><button className="text-xs underline" onClick={() => setMusic(null)}>remover</button></>}
            </div>
            {music && (
              <label className="block text-sm">Volume da música: {Math.round(s.musicVolume * 100)}%
                <input type="range" min={0} max={1} step={0.05} className="mt-1 w-full accent-brand-600" value={s.musicVolume} onChange={(e) => set({ musicVolume: Number(e.target.value) })} />
              </label>
            )}
            <p className="text-xs text-muted">Use só músicas que você tem direito de usar.</p>
          </section>
        </div>
      </div>

      {state === "done" && outBlob && (
        <UpscalePanel clip={outBlob} seconds={s.end - s.start} name={slug(clip.titulo)} aspect={`${W}/${H}`} />
      )}

      {/* Exportar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          {state === "rendering" ? (
            <div className="flex-1">
              <p className="text-sm font-semibold">Gerando vídeo... {Math.round(pct * 100)}%</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-50"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round(pct * 100)}%` }} /></div>
            </div>
          ) : state === "done" && out ? (
            <>
              <video src={out} className="h-12 rounded-lg bg-black" muted />
              <span className="flex-1 text-sm font-semibold text-green-700">Vídeo pronto!</span>
              <a className="btn-primary" href={out} download={`${slug(clip.titulo)}-${s.aspect.replace(":", "x")}.mp4`}><IconDownload className="h-4 w-4" />Baixar MP4</a>
            </>
          ) : (
            <>
              <span className="flex-1 text-xs text-muted">{err ? <span className="text-red-700">{err}</span> : `${s.aspect} · ${dimsOf(s).join("x")}${s.quality === "4k" ? " · 4K pode levar vários minutos" : ""} · gerado no seu aparelho`}</span>
              <button className="btn-primary" onClick={exportar}><IconScissors className="h-4 w-4" />Exportar vídeo</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
