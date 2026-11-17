"use client";
import { useState } from "react";
import type { Project } from "@/lib/store";
import { TEMPLATES } from "@/lib/templates";
import { fmtClock } from "@/lib/time";
import { Markdown } from "../markdown";
import { api, CopyButton } from "../ui";
import { IconPlay, IconScissors, IconSend } from "../icons";

type Moment = { inicio: number; fim: number; descricao: string };

export function AiTab({ p, update, seek, makeClip }: {
  p: Project; update: (patch: Partial<Project>) => Promise<void>;
  seek: (t: number) => void; makeClip: (inicio: number, fim: number, titulo: string) => void;
}) {
  const [mode, setMode] = useState<"chat" | "modelos" | "momentos">("chat");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [mq, setMq] = useState("");
  const chat = p.chat ?? [];
  const outputs = p.outputs ?? {};
  const [open, setOpen] = useState<string | null>(null);

  async function ask(question: string) {
    if (!question.trim()) return;
    setBusy("chat"); setErr(""); setQ("");
    const history = [...chat, { role: "user" as const, content: question }];
    await update({ chat: history });
    try {
      const r = await api<{ text: string }>("/api/ai", { action: "ask", title: p.title, segments: p.segments, history: chat.slice(-10), question });
      await update({ chat: [...history, { role: "assistant", content: r.text }] });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  async function runTemplate(id: string) {
    setOpen(id);
    if (outputs[id]) return;
    setBusy(id); setErr("");
    try {
      const r = await api<{ text: string }>("/api/ai", { action: "template", title: p.title, segments: p.segments, templateId: id });
      await update({ outputs: { ...outputs, [id]: r.text } });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  async function findMoments() {
    if (!mq.trim()) return;
    setBusy("momentos"); setErr(""); setMoments(null);
    try {
      const r = await api<{ momentos: Moment[] }>("/api/ai", { action: "moments", title: p.title, segments: p.segments, query: mq });
      setMoments(r.momentos);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex w-full rounded-xl bg-brand-50 p-1 sm:w-auto">
        {([["chat", "Perguntar"], ["modelos", "Modelos prontos"], ["momentos", "Encontrar momentos"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium sm:flex-none ${mode === k ? "bg-white text-brand-700 shadow-sm" : "text-muted"}`}>{l}</button>
        ))}
      </div>
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      {mode === "chat" && (
        <div className="card space-y-4">
          {chat.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted">Pergunte qualquer coisa sobre o vídeo. Exemplos:</p>
              <div className="flex flex-wrap gap-2">
                {["Quais são as 3 ideias principais?", "Ela citou algum alimento específico?", "Quais dúvidas o público pode ter?"].map((s) => (
                  <button key={s} className="chip py-1.5" onClick={() => ask(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${m.role === "user" ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-canvas"}`}>
                  {m.role === "user" ? m.content : <Markdown text={m.content} />}
                </div>
              </div>
            ))}
            {busy === "chat" && <div className="h-10 w-24 animate-pulse rounded-2xl bg-canvas" />}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pergunte sobre o vídeo..." disabled={busy === "chat"} />
            <button className="btn-primary h-12 w-12 shrink-0 p-0" disabled={busy === "chat" || !q.trim()} title="Enviar"><IconSend className="h-5 w-5" /></button>
          </form>
          {chat.length > 0 && <button className="text-xs text-muted underline" onClick={() => update({ chat: [] })}>Limpar conversa</button>}
        </div>
      )}

      {mode === "modelos" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => runTemplate(t.id)}
                className={`card flex flex-col items-start gap-1 p-3 text-left transition ${open === t.id ? "border-brand-400 ring-4 ring-brand-100" : "hover:border-brand-200"}`}>
                <span className="text-xl">{t.emoji}</span>
                <span className="text-sm font-semibold leading-tight">{t.nome}</span>
                {outputs[t.id] && <span className="text-[11px] text-green-700">pronto</span>}
              </button>
            ))}
          </div>
          {open && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">{TEMPLATES.find((t) => t.id === open)?.nome}</p>
                {outputs[open] && (
                  <div className="flex gap-2">
                    <CopyButton text={outputs[open]} />
                    <button className="btn-secondary px-3 py-1.5 text-xs" onClick={async () => { const { [open]: _, ...rest } = outputs; await update({ outputs: rest }); runTemplate(open); }}>Refazer</button>
                  </div>
                )}
              </div>
              {busy === open ? <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-canvas" />)}<p className="text-xs text-muted">Escrevendo...</p></div>
                : outputs[open] ? <Markdown text={outputs[open]} /> : null}
            </div>
          )}
        </div>
      )}

      {mode === "momentos" && (
        <div className="card space-y-4">
          <p className="text-sm text-muted">Descreva o que você procura e a IA acha os trechos do vídeo.</p>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); findMoments(); }}>
            <input className="input" value={mq} onChange={(e) => setMq(e.target.value)} placeholder='Ex.: "quando ela fala sobre ovo"' />
            <button className="btn-primary shrink-0" disabled={busy === "momentos" || !mq.trim()}>{busy === "momentos" ? "Buscando..." : "Buscar"}</button>
          </form>
          {moments && moments.length === 0 && <p className="text-sm text-muted">Nenhum momento encontrado.</p>}
          {moments && moments.length > 0 && (
            <ul className="divide-y divide-line">
              {moments.map((m, i) => (
                <li key={i} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="font-mono text-sm text-brand-600">{fmtClock(m.inicio)}–{fmtClock(m.fim)}</span>
                  <span className="min-w-0 flex-1 text-sm">{m.descricao}</span>
                  <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => seek(m.inicio)}><IconPlay className="h-3.5 w-3.5" />Ver</button>
                  <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => makeClip(m.inicio, Math.max(m.fim, m.inicio + 10), m.descricao)}><IconScissors className="h-3.5 w-3.5" />Virar clipe</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
