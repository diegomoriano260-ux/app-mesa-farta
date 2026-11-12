"use client";
import { startTransition, useActionState, useState } from "react";
import { saveAutomation } from "./actions";
import type { MessageContent, Trigger } from "@/lib/meta/types";
import { IconComment, IconImage, IconLink, IconPlus, IconSend, IconText, IconWhatsapp } from "@/components/icons";

type ChannelOpt = { id: string; kind: "instagram" | "whatsapp"; display_name: string | null };
type Post = { id: string; caption?: string; thumbnail_url?: string; media_url?: string; media_type: string; timestamp: string };
type Initial = {
  id?: string; name: string; channel_id: string; trigger: Trigger; post_id: string | null; keywords: string[];
  match_mode: "contains" | "exact"; public_reply: string | null; tag_to_add: string | null; priority: number;
  is_active: boolean; messages: MessageContent[];
};
type Msg = { kind: MessageContent["kind"]; text: string; url: string; buttons: { title: string; url: string }[] };

const triggers = [
  { value: "ig_comment" as const, title: "Comentou no post", text: "Alguém comenta num post ou reel", Icon: IconComment, channel: "instagram" as const },
  { value: "ig_dm" as const, title: "Mandou no Direct", text: "Alguém envia mensagem no Instagram", Icon: IconSend, channel: "instagram" as const },
  { value: "wa_message" as const, title: "Mandou no WhatsApp", text: "Alguém envia mensagem no WhatsApp", Icon: IconWhatsapp, channel: "whatsapp" as const },
];

const toMsg = (m?: MessageContent): Msg => ({
  kind: m?.kind ?? "text",
  text: m && "text" in m ? m.text : "",
  url: m?.kind === "image" ? m.url : "",
  buttons: [0, 1, 2].map((i) => (m?.kind === "buttons" ? m.buttons[i] : undefined) ?? { title: "", url: "" }),
});

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="mb-4 flex items-center gap-3 text-base font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm text-white">{n}</span>{title}
      </h2>
      {children}
    </section>
  );
}

function Segmented<T extends string>({ value, onChange, options, name }: { value: T; onChange: (v: T) => void; name?: string; options: { value: T; label: string; Icon?: typeof IconText }[] }) {
  return (
    <div className="inline-flex w-full rounded-xl bg-brand-50 p-1 sm:w-auto">
      {options.map((o) => (
        <label key={o.value} className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition sm:flex-none sm:px-3 ${value === o.value ? "bg-white text-brand-700 shadow-sm" : "text-muted"}`}>
          {name && <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />}
          {!name && <input type="radio" checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />}
          {o.Icon && <o.Icon className="h-4 w-4" />}{o.label}
        </label>
      ))}
    </div>
  );
}

function MessageEditor({ i, msg, onChange, onRemove }: { i: number; msg: Msg; onChange: (m: Msg) => void; onRemove?: () => void }) {
  const set = (p: Partial<Msg>) => onChange({ ...msg, ...p });
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Mensagem {i + 1}</p>
        {onRemove && <button type="button" onClick={onRemove} className="text-xs font-medium text-muted hover:text-red-700">remover</button>}
      </div>
      <Segmented name={`m${i}_kind`} value={msg.kind} onChange={(kind) => set({ kind })}
        options={[{ value: "text", label: "Texto", Icon: IconText }, { value: "buttons", label: "Com link", Icon: IconLink }, { value: "image", label: "Imagem", Icon: IconImage }]} />
      <div className="mt-3 space-y-3">
        {msg.kind !== "image" && (
          <textarea name={`m${i}_text`} value={msg.text} onChange={(e) => set({ text: e.target.value })} rows={3} className="input resize-none"
            placeholder={msg.kind === "buttons" ? "Oi! Toque no botão abaixo para ver 💕" : "Oi! Aqui está o que você pediu 💕"} />
        )}
        {msg.kind === "image" && (
          <input name={`m${i}_url`} value={msg.url} onChange={(e) => set({ url: e.target.value })} className="input" placeholder="Link público da imagem (https://...)" />
        )}
        {msg.kind === "buttons" && (
          <div className="space-y-2">
            {msg.buttons.map((b, bi) => (
              <div key={bi} className="grid grid-cols-[2fr_3fr] gap-2">
                <input name={`m${i}_b${bi}_title`} value={b.title} maxLength={20} className="input"
                  onChange={(e) => set({ buttons: msg.buttons.map((x, j) => (j === bi ? { ...x, title: e.target.value } : x)) })}
                  placeholder={bi === 0 ? "Nome do botão" : `Botão ${bi + 1} (opcional)`} />
                <input name={`m${i}_b${bi}_url`} value={b.url} className="input" inputMode="url"
                  onChange={(e) => set({ buttons: msg.buttons.map((x, j) => (j === bi ? { ...x, url: e.target.value } : x)) })}
                  placeholder="https://..." />
              </div>
            ))}
            <p className="hint">Nome do botão: até 20 letras. No WhatsApp, com 2 ou mais botões os links vão no texto.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Preview({ publicReply, msgs, isComment, channel }: { publicReply: string; msgs: Msg[]; isComment: boolean; channel: "instagram" | "whatsapp" }) {
  const shown = isComment ? msgs.slice(0, 1) : msgs;
  const bubble = channel === "whatsapp" ? "bg-[#dcf8c6] text-ink" : "bg-gradient-to-br from-brand-500 to-brand-700 text-white";
  return (
    <div className="rounded-[28px] border border-line bg-white p-3 shadow-(--shadow-soft)">
      <div className="rounded-[20px] bg-canvas p-4">
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">Prévia</p>
        {isComment && publicReply && (
          <div className="mb-4 rounded-xl bg-white p-3 text-xs shadow-sm">
            <p className="text-muted">Resposta no comentário</p>
            <p className="mt-1">{publicReply}</p>
          </div>
        )}
        <div className="flex flex-col items-end gap-2">
          {shown.every((m) => !m.text && !m.url) && <p className="self-center py-6 text-center text-xs text-muted">Escreva a mensagem para ver aqui</p>}
          {shown.map((m, i) => {
            if (m.kind === "image") return m.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={m.url} alt="" className="max-h-40 max-w-[80%] rounded-2xl object-cover" />
            ) : null;
            if (!m.text) return null;
            const btns = m.kind === "buttons" ? m.buttons.filter((b) => b.title) : [];
            return (
              <div key={i} className="max-w-[85%]">
                <div className={`whitespace-pre-wrap rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm ${bubble}`}>{m.text}</div>
                {btns.map((b, j) => (
                  <div key={j} className="mt-1 rounded-xl border border-line bg-white px-3 py-2 text-center text-sm font-semibold text-brand-700">{b.title}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AutomationForm({ initial, channels, posts }: { initial: Initial; channels: ChannelOpt[]; posts: Record<string, Post[]> }) {
  const [state, action, pending] = useActionState(saveAutomation, undefined);
  const [trigger, setTrigger] = useState<Trigger>(initial.trigger);
  const want = triggers.find((t) => t.value === trigger)!.channel;
  const options = channels.filter((c) => c.kind === want);
  const [channelId, setChannelId] = useState(initial.channel_id);
  const currentChannel = options.find((c) => c.id === channelId)?.id ?? options[0]?.id ?? "";
  const channelPosts = posts[currentChannel] ?? [];
  const [postId, setPostId] = useState(initial.post_id ?? "");
  const [keywords, setKeywords] = useState(initial.keywords.join(", "));
  const [matchMode, setMatchMode] = useState<"contains" | "exact">(initial.match_mode);
  const [publicReply, setPublicReply] = useState(initial.public_reply ?? "");
  const [msgs, setMsgs] = useState<Msg[]>(initial.messages.length ? initial.messages.map(toMsg) : [toMsg()]);
  const [active, setActive] = useState(initial.is_active);
  const isComment = trigger === "ig_comment";
  const visible = isComment ? msgs.slice(0, 1) : msgs;
  const chips = keywords.split(/[,\n;]/).map((k) => k.trim()).filter(Boolean);

  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }}
      className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="card lg:col-start-2 lg:row-start-1">
        <label className="label" htmlFor="name">Nome da automação</label>
        <input id="name" name="name" defaultValue={initial.name} className="input" placeholder="Ex.: Link do curso" required />
        <label className="mt-4 flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-semibold">{active ? "Ligada" : "Desligada"}<span className="block text-xs font-normal text-muted">{active ? "Começa a responder ao salvar" : "Fica salva, sem responder"}</span></span>
          <input type="checkbox" name="is_active" checked={active} onChange={(e) => setActive(e.target.checked)} className="sr-only" />
          <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${active ? "bg-brand-600" : "bg-neutral-300"}`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${active ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </label>
      </div>
      <div className="space-y-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        {initial.id && <input type="hidden" name="id" value={initial.id} />}

        <Step n={1} title="Quando alguém...">
          <div className="grid gap-3 sm:grid-cols-3">
            {triggers.map((t) => (
              <label key={t.value} className={`flex cursor-pointer flex-col gap-2 rounded-2xl border-2 p-4 transition ${trigger === t.value ? "border-brand-500 bg-brand-50" : "border-line hover:border-brand-200"}`}>
                <input type="radio" name="trigger" value={t.value} checked={trigger === t.value} onChange={() => setTrigger(t.value)} className="sr-only" />
                <t.Icon className={`h-6 w-6 ${trigger === t.value ? "text-brand-600" : "text-muted"}`} />
                <span className="font-semibold">{t.title}</span>
                <span className="text-xs text-muted">{t.text}</span>
              </label>
            ))}
          </div>
          {options.length === 0 ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Conecte o {want === "instagram" ? "Instagram" : "WhatsApp"} em <a href="/canais" className="font-semibold underline">Canais</a> primeiro.
            </p>
          ) : options.length === 1 ? (
            <input type="hidden" name="channel_id" value={currentChannel} />
          ) : (
            <div className="mt-4">
              <label className="label" htmlFor="channel_id">Qual conta?</label>
              <select id="channel_id" name="channel_id" className="input" value={currentChannel} onChange={(e) => setChannelId(e.target.value)}>
                {options.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
              </select>
            </div>
          )}
        </Step>

        {isComment && (
          <Step n={2} title="Em qual post?">
            <input type="hidden" name="post_id" value={postId} />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <button type="button" onClick={() => setPostId("")}
                className={`flex aspect-square items-center justify-center rounded-xl border-2 p-2 text-center text-xs font-semibold transition ${postId === "" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted"}`}>
                Qualquer post
              </button>
              {channelPosts.map((p) => (
                <button type="button" key={p.id} onClick={() => setPostId(p.id)} title={p.caption ?? ""}
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${postId === p.id ? "border-brand-500 ring-4 ring-brand-100" : "border-transparent"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbnail_url ?? p.media_url} alt={p.caption?.slice(0, 60) ?? "post"} className="h-full w-full bg-brand-50 object-cover" />
                </button>
              ))}
            </div>
            {channelPosts.length === 0 && (
              <input className="input mt-3" value={postId} onChange={(e) => setPostId(e.target.value.trim())}
                placeholder="Não consegui carregar os posts. Deixe vazio (qualquer post) ou cole o ID." />
            )}
          </Step>
        )}

        <Step n={isComment ? 3 : 2} title="Com qual palavra-chave?">
          <input name="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} className="input" placeholder="quero, link, eu quero" />
          <div className="mt-2 flex min-h-7 flex-wrap gap-1.5">
            {chips.length ? chips.map((k) => <span key={k} className="chip">{k}</span>)
              : <span className="text-xs text-muted">Sem palavra-chave = responde {isComment ? "todo comentário" : "toda mensagem"}.</span>}
          </div>
          <p className="hint">Separe por vírgula. Maiúsculas e acentos não importam: “Cardápio” e “cardapio” são iguais.</p>
          <div className="mt-3">
            <Segmented name="match_mode" value={matchMode} onChange={setMatchMode}
              options={[{ value: "contains", label: "Contém a palavra" }, { value: "exact", label: "Só a palavra" }]} />
          </div>
        </Step>

        <Step n={isComment ? 4 : 3} title="O que responder">
          <div className="space-y-4">
            {isComment && (
              <div>
                <label className="label" htmlFor="public_reply">Resposta no comentário <span className="font-normal text-muted">(opcional)</span></label>
                <input id="public_reply" name="public_reply" value={publicReply} onChange={(e) => setPublicReply(e.target.value)} className="input" placeholder="Te mandei no direct! 💌" />
              </div>
            )}
            {visible.map((m, i) => (
              <MessageEditor key={i} i={i} msg={m}
                onChange={(nm) => setMsgs(msgs.map((x, j) => (j === i ? nm : x)))}
                onRemove={i > 0 ? () => setMsgs(msgs.filter((_, j) => j !== i)) : undefined} />
            ))}
            {isComment ? (
              <p className="rounded-xl bg-brand-50 p-3 text-xs leading-relaxed text-brand-700">
                Regra do Instagram: num comentário dá para mandar <b>1 mensagem</b> no Direct. Se a pessoa responder, a conversa continua normalmente.
              </p>
            ) : msgs.length < 3 && (
              <button type="button" onClick={() => setMsgs([...msgs, toMsg()])} className="btn-secondary w-full border-dashed">
                <IconPlus className="h-4 w-4" />Adicionar outra mensagem
              </button>
            )}
          </div>
        </Step>

        <details className="card group">
          <summary className="cursor-pointer list-none text-sm font-semibold text-muted">Opções avançadas <span className="group-open:hidden">+</span></summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="tag_to_add">Etiqueta no contato</label>
              <input id="tag_to_add" name="tag_to_add" defaultValue={initial.tag_to_add ?? ""} className="input" placeholder="curso-novembro" />
              <p className="hint">Para achar depois quem participou.</p>
            </div>
            <div>
              <label className="label" htmlFor="priority">Prioridade</label>
              <input id="priority" name="priority" type="number" defaultValue={initial.priority} className="input" />
              <p className="hint">Se duas automações servirem, ganha a maior.</p>
            </div>
          </div>
        </details>
      </div>

      <aside className="space-y-4 lg:col-start-2 lg:row-start-2 lg:sticky lg:top-24">
        <Preview publicReply={publicReply} msgs={msgs} isComment={isComment} channel={want} />
        {state?.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
        <div className="fixed inset-x-0 bottom-[68px] z-20 border-t border-line bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
          <button className="btn-primary w-full py-3 text-base" disabled={pending || options.length === 0}>{pending ? "Salvando..." : "Salvar automação"}</button>
        </div>
      </aside>
    </form>
  );
}
