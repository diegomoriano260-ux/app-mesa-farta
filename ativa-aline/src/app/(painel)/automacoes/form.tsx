"use client";
import { startTransition, useActionState, useState } from "react";
import { saveAutomation } from "./actions";
import type { MessageContent, Trigger } from "@/lib/meta/types";

type ChannelOpt = { id: string; kind: "instagram" | "whatsapp"; display_name: string | null };
type Post = { id: string; caption?: string; thumbnail_url?: string; media_url?: string; media_type: string; timestamp: string };
type Initial = {
  id?: string; name: string; channel_id: string; trigger: Trigger; post_id: string | null; keywords: string[];
  match_mode: "contains" | "exact"; public_reply: string | null; tag_to_add: string | null; priority: number;
  is_active: boolean; messages: MessageContent[];
};

const triggers: { value: Trigger; label: string; channel: "instagram" | "whatsapp" }[] = [
  { value: "ig_comment", label: "Alguém comenta num post do Instagram", channel: "instagram" },
  { value: "ig_dm", label: "Alguém manda mensagem no Direct", channel: "instagram" },
  { value: "wa_message", label: "Alguém manda mensagem no WhatsApp", channel: "whatsapp" },
];

function MessageSlot({ i, initial, disabled }: { i: number; initial?: MessageContent; disabled: boolean }) {
  const [kind, setKind] = useState<MessageContent["kind"]>(initial?.kind ?? "text");
  const text = initial && "text" in initial ? initial.text : "";
  const buttons = initial?.kind === "buttons" ? initial.buttons : [];
  return (
    <fieldset className={`rounded-lg border border-neutral-200 p-4 ${disabled ? "opacity-50" : ""}`} disabled={disabled}>
      <legend className="px-1 text-sm font-medium">Mensagem {i + 1}{i > 0 && " (opcional)"}</legend>
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        {(["text", "buttons", "image"] as const).map((k) => (
          <label key={k} className="flex items-center gap-1.5">
            <input type="radio" name={`m${i}_kind`} value={k} checked={kind === k} onChange={() => setKind(k)} />
            {k === "text" ? "Texto" : k === "buttons" ? "Texto + botões de link" : "Imagem"}
          </label>
        ))}
      </div>
      {kind !== "image" && (
        <textarea name={`m${i}_text`} defaultValue={text} rows={3} className="input" placeholder="Oi! Aqui está o link que você pediu 💕" />
      )}
      {kind === "image" && (
        <input name={`m${i}_url`} defaultValue={initial?.kind === "image" ? initial.url : ""} className="input" placeholder="https://... (link público da imagem)" />
      )}
      {kind === "buttons" && (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((b) => (
            <div key={b} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
              <input name={`m${i}_b${b}_title`} defaultValue={buttons[b]?.title} maxLength={20} className="input" placeholder={`Botão ${b + 1} (até 20 letras)`} />
              <input name={`m${i}_b${b}_url`} defaultValue={buttons[b]?.url} className="input" placeholder="https://..." />
            </div>
          ))}
          <p className="hint">No WhatsApp, com mais de 1 botão os links vão no texto.</p>
        </div>
      )}
    </fieldset>
  );
}

export function AutomationForm({ initial, channels, posts }: { initial: Initial; channels: ChannelOpt[]; posts: Record<string, Post[]> }) {
  const [state, action, pending] = useActionState(saveAutomation, undefined);
  const [trigger, setTrigger] = useState<Trigger>(initial.trigger);
  const want = triggers.find((t) => t.value === trigger)!.channel;
  const options = channels.filter((c) => c.kind === want);
  const [channelId, setChannelId] = useState(options.find((c) => c.id === initial.channel_id)?.id ?? options[0]?.id ?? "");
  const currentChannel = options.find((c) => c.id === channelId) ? channelId : options[0]?.id ?? "";
  const channelPosts = posts[currentChannel] ?? [];
  const [postId, setPostId] = useState(initial.post_id ?? "");
  const isComment = trigger === "ig_comment";

  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }} className="space-y-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="name">Nome</label>
          <input id="name" name="name" defaultValue={initial.name} className="input" placeholder="Ex.: Link do curso no post de hoje" required />
        </div>

        <div>
          <span className="label">Quando...</span>
          <div className="space-y-2">
            {triggers.map((t) => (
              <label key={t.value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="trigger" value={t.value} checked={trigger === t.value} onChange={() => setTrigger(t.value)} />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="channel_id">Conta</label>
          {options.length === 0 ? (
            <p className="text-sm text-amber-800">Conecte o {want === "instagram" ? "Instagram" : "WhatsApp"} em Canais primeiro.</p>
          ) : (
            <select id="channel_id" name="channel_id" className="input" value={currentChannel} onChange={(e) => setChannelId(e.target.value)}>
              {options.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
            </select>
          )}
        </div>

        {isComment && (
          <div>
            <span className="label">Em qual post?</span>
            <input type="hidden" name="post_id" value={postId} />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <button type="button" onClick={() => setPostId("")}
                className={`flex aspect-square items-center justify-center rounded-lg border p-2 text-center text-xs ${postId === "" ? "border-brand-500 ring-2 ring-brand-100" : "border-neutral-200"}`}>
                Qualquer post
              </button>
              {channelPosts.map((p) => (
                <button type="button" key={p.id} onClick={() => setPostId(p.id)} title={p.caption ?? ""}
                  className={`aspect-square overflow-hidden rounded-lg border ${postId === p.id ? "border-brand-500 ring-2 ring-brand-100" : "border-neutral-200"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbnail_url ?? p.media_url} alt={p.caption?.slice(0, 60) ?? "post"} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            {channelPosts.length === 0 && (
              <div className="mt-2">
                <input className="input" value={postId} onChange={(e) => setPostId(e.target.value.trim())} placeholder="Não carreguei os posts. Cole o ID do post, ou deixe vazio para qualquer post." />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label" htmlFor="keywords">Palavras-chave</label>
          <input id="keywords" name="keywords" defaultValue={initial.keywords.join(", ")} className="input" placeholder="quero, link, eu quero" />
          <p className="hint">Separe por vírgula. Maiúsculas e acentos não importam. Vazio = responde qualquer {isComment ? "comentário" : "mensagem"}.</p>
          <div className="mt-2 flex gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" name="match_mode" value="contains" defaultChecked={initial.match_mode !== "exact"} /> contém a palavra</label>
            <label className="flex items-center gap-1.5"><input type="radio" name="match_mode" value="exact" defaultChecked={initial.match_mode === "exact"} /> é exatamente a palavra</label>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">...responder com</h2>
        {isComment && (
          <div>
            <label className="label" htmlFor="public_reply">Resposta pública no comentário (opcional)</label>
            <input id="public_reply" name="public_reply" defaultValue={initial.public_reply ?? ""} className="input" placeholder="Te mandei no direct! 💌" />
          </div>
        )}
        {isComment && (
          <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
            Regra do Instagram: num comentário só dá para mandar <b>uma</b> mensagem no direct. Só a Mensagem 1 é enviada.
          </p>
        )}
        {[0, 1, 2].map((i) => (
          <MessageSlot key={i} i={i} initial={initial.messages[i]} disabled={isComment && i > 0} />
        ))}
      </div>

      <div className="card grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="tag_to_add">Etiqueta no contato (opcional)</label>
          <input id="tag_to_add" name="tag_to_add" defaultValue={initial.tag_to_add ?? ""} className="input" placeholder="curso-novembro" />
        </div>
        <div>
          <label className="label" htmlFor="priority">Prioridade</label>
          <input id="priority" name="priority" type="number" defaultValue={initial.priority} className="input" />
          <p className="hint">Se duas casarem, ganha a maior.</p>
        </div>
        <label className="flex items-center gap-2 self-center text-sm font-medium">
          <input type="checkbox" name="is_active" defaultChecked={initial.is_active} className="h-4 w-4" /> Ativa
        </label>
      </div>

      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary" disabled={pending || options.length === 0}>{pending ? "Salvando..." : "Salvar automação"}</button>
    </form>
  );
}
