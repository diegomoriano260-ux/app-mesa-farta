"use client";
import { useState } from "react";
import type { Project } from "@/lib/store";
import { fmtClock, toSrt, toVtt, toTxt, type Segment } from "@/lib/time";
import { api, download, slug } from "../ui";
import { IconDownload } from "../icons";

const LANGS = ["Inglês", "Espanhol", "Francês", "Italiano", "Alemão", "Português (Portugal)", "Japonês", "Árabe"];

export function TranslateTab({ p, update }: { p: Project; update: (patch: Partial<Project>) => Promise<void> }) {
  const [lang, setLang] = useState(LANGS[0]);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const tr = p.translations ?? {};
  const [view, setView] = useState<string | null>(Object.keys(tr)[0] ?? null);

  async function run() {
    setBusy(true); setErr(""); setPct(0);
    try {
      const out: Segment[] = [];
      for (let i = 0; i < p.segments.length; i += 150) {
        const r = await api<{ segments: Segment[] }>("/api/ai", { action: "translate", language: lang, segments: p.segments.slice(i, i + 150) });
        out.push(...r.segments);
        setPct(Math.min(1, (i + 150) / p.segments.length));
      }
      await update({ translations: { ...tr, [lang]: out } });
      setView(lang);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  const segs = view ? tr[view] : null;
  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <p className="text-sm text-muted">Traduz a transcrição e as legendas. Depois, no editor do clipe, escolha o idioma da legenda.</p>
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto" value={lang} onChange={(e) => setLang(e.target.value)} disabled={busy}>
            {LANGS.map((l) => <option key={l}>{l}</option>)}
          </select>
          <button className="btn-primary" onClick={run} disabled={busy}>{busy ? `Traduzindo... ${Math.round(pct * 100)}%` : tr[lang] ? "Traduzir de novo" : "Traduzir"}</button>
        </div>
        {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        {Object.keys(tr).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(tr).map((l) => <button key={l} onClick={() => setView(l)} className={`badge py-1.5 ${view === l ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line"}`}>{l}</button>)}
          </div>
        )}
      </div>
      {segs && view && (
        <div className="card space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["txt", "srt", "vtt"] as const).map((f) => (
              <button key={f} className="btn-secondary px-3 py-1.5 text-xs" onClick={() => download(`${slug(p.title)}-${slug(view)}.${f}`, new Blob([f === "txt" ? toTxt(segs) : f === "srt" ? toSrt(segs) : toVtt(segs)], { type: "text/plain" }))}>
                <IconDownload className="h-3.5 w-3.5" />{f.toUpperCase()}
              </button>
            ))}
          </div>
          <ul className="max-h-[55vh] space-y-2 overflow-y-auto">
            {segs.map((s, i) => <li key={i} className="flex gap-3 text-sm"><span className="w-14 shrink-0 font-mono text-xs leading-6 text-brand-600">{fmtClock(s.start)}</span><span>{s.text}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
