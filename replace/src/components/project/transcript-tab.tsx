"use client";
import { useState } from "react";
import type { Project } from "@/lib/store";
import { fmtClock, toSrt, toTxt, toVtt } from "@/lib/time";
import { CopyButton, download, slug } from "../ui";
import { IconDownload, IconScissors } from "../icons";

// Transcrição com busca, downloads e "editar pela transcrição": marque o começo e o fim e vira clipe.
export function TranscriptTab({ p, seek, makeClip }: { p: Project; seek: (t: number) => void; makeClip: (inicio: number, fim: number, titulo: string) => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [selecting, setSelecting] = useState(false);
  const lo = sel.length ? Math.min(...sel) : -1;
  const hi = sel.length ? Math.max(...sel) : -1;
  const list = p.segments.map((s, i) => ({ ...s, i })).filter((s) => !q || s.text.toLowerCase().includes(q.toLowerCase()));

  function tap(i: number) {
    if (!selecting) return seek(p.segments[i].start);
    setSel((prev) => (prev.length >= 2 ? [i] : [...prev, i]));
  }

  const selStart = lo >= 0 ? p.segments[lo].start : 0;
  const selEnd = hi >= 0 ? p.segments[hi].end : 0;

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className="input min-w-0 flex-1" placeholder="Buscar na transcrição..." value={q} onChange={(e) => setQ(e.target.value)} />
        {(["txt", "srt", "vtt"] as const).map((f) => (
          <button key={f} className="btn-secondary px-3 text-sm" onClick={() => download(`${slug(p.title)}.${f}`, new Blob([f === "txt" ? toTxt(p.segments) : f === "srt" ? toSrt(p.segments) : toVtt(p.segments)], { type: "text/plain" }))}>
            <IconDownload className="h-4 w-4" />{f.toUpperCase()}
          </button>
        ))}
        <CopyButton text={toTxt(p.segments)} />
      </div>

      <div className={`flex flex-wrap items-center gap-2 rounded-xl p-3 text-sm ${selecting ? "bg-brand-50" : "bg-canvas"}`}>
        {!selecting ? (
          <><span className="flex-1 text-muted">Toque numa frase para ir até ela no vídeo.</span>
            <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => { setSelecting(true); setSel([]); }}><IconScissors className="h-3.5 w-3.5" />Criar clipe pelo texto</button></>
        ) : (
          <><span className="flex-1 text-brand-700">{sel.length === 0 ? "Toque na primeira frase do clipe." : sel.length === 1 ? "Agora toque na última frase." : `Trecho ${fmtClock(selStart)}–${fmtClock(selEnd)} (${Math.round(selEnd - selStart)}s)`}</span>
            {sel.length >= 1 && <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => { makeClip(selStart, hi >= 0 ? selEnd : p.segments[lo].end, p.segments[lo].text.slice(0, 60)); setSelecting(false); setSel([]); }}>Criar clipe</button>}
            <button className="text-xs text-muted underline" onClick={() => { setSelecting(false); setSel([]); }}>cancelar</button></>
        )}
      </div>

      <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
        {list.map((s) => {
          const on = selecting && s.i >= lo && s.i <= hi && lo >= 0;
          return (
            <li key={s.i}>
              <button onClick={() => tap(s.i)} className={`flex w-full gap-3 rounded-lg px-2 py-1.5 text-left text-sm leading-relaxed transition ${on ? "bg-brand-100" : "hover:bg-canvas"}`}>
                <span className="w-14 shrink-0 font-mono text-xs leading-6 text-brand-600">{fmtClock(s.start)}</span><span>{s.text}</span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="text-sm text-muted">Nada encontrado.</li>}
      </ul>
    </div>
  );
}
