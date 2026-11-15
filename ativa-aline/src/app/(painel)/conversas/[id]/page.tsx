import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtDate } from "@/components/ui";
import { toggleBotHere } from "../actions";
import { ReplyForm } from "./reply-form";

type Item = { at: Date; from_me: boolean; kind: string; text: string | null; status: string | null; content: Record<string, unknown> | null };

const label: Record<string, string> = {
  ig_comment: "comentou no post", ig_dm: "", wa_message: "",
  private_reply: "robô · Direct", public_reply: "robô · resposta no post", dm: "robô", wa: "robô", manual: "você",
};

export default async function Conversa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sql = db();
  const [c] = await sql<{ id: string; who: string; kind: string; bot_paused: boolean; open: boolean; tags: string[] }[]>`
    select c.id, coalesce('@' || c.username, c.name, c.external_id) as who, ch.kind, c.bot_paused, c.tags,
      coalesce(c.last_inbound_at > now() - interval '24 hours', false) as open
    from contacts c join channels ch on ch.id = c.channel_id where c.id = ${id}`;
  if (!c) notFound();
  const items = await sql<Item[]>`
    select received_at as at, false as from_me, kind, text, null as status, null::jsonb as content from inbound_events where contact_id = ${id}
    union all
    select sent_at, true, kind, content->>'text', status, content from dispatches where contact_id = ${id}
    order by at asc limit 300`;

  return (
    <div className="pb-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/conversas" className="text-sm text-muted hover:text-ink">← Conversas</Link>
      </div>
      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{c.who}</p>
          <p className="text-xs text-muted">{c.kind === "instagram" ? "Instagram" : "WhatsApp"}{c.tags.length ? ` · ${c.tags.join(", ")}` : ""}</p>
        </div>
        <form action={toggleBotHere}>
          <input type="hidden" name="id" value={c.id} />
          <button className={`badge py-1.5 ${c.bot_paused ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700"}`}>
            {c.bot_paused ? "robô pausado · retomar" : "robô ativo · pausar"}
          </button>
        </form>
      </div>

      <div className="card space-y-3 bg-canvas">
        {items.length === 0 && <p className="py-6 text-center text-sm text-muted">Sem mensagens.</p>}
        {items.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.from_me ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${m.from_me ? "rounded-br-md bg-gradient-to-br from-brand-500 to-brand-700 text-white" : "rounded-bl-md bg-white shadow-sm"} ${m.status === "failed" ? "opacity-60" : ""}`}>
              {m.text ?? (m.content?.kind === "image" ? "🖼 imagem" : "(mídia)")}
              {Array.isArray(m.content?.buttons) && (m.content!.buttons as { title: string }[]).map((b, j) => (
                <span key={j} className="mt-2 block rounded-lg bg-white/20 px-2 py-1 text-center text-xs font-semibold">{b.title}</span>
              ))}
            </div>
            <span className="mt-1 text-[11px] text-muted">
              {label[m.kind] ? `${label[m.kind]} · ` : ""}{fmtDate(m.at)}{m.status === "failed" ? " · falhou" : ""}
            </span>
          </div>
        ))}
      </div>

      <div className="card mt-4">
        {c.open ? (
          <ReplyForm contactId={c.id} />
        ) : (
          <p className="text-sm text-muted">
            A Meta só deixa responder por aqui até <b>24 horas</b> depois da última mensagem da pessoa no Direct ou WhatsApp.
            Para falar com ela agora, responda pelo app do Instagram.
          </p>
        )}
      </div>
    </div>
  );
}
