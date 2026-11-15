import Link from "next/link";
import { db } from "@/lib/db";
import { EmptyState, fmtDate, PageHeader } from "@/components/ui";
import { IconComment, IconInstagram, IconWhatsapp } from "@/components/icons";

export default async function Conversas() {
  const rows = await db()<{ id: string; who: string; kind: string; last_at: Date; last_text: string | null; last_from_me: boolean; open: boolean; bot_paused: boolean }[]>`
    with timeline as (
      select contact_id, received_at as at, text, false as from_me from inbound_events
      union all
      select contact_id, sent_at, content->>'text', true from dispatches where content is not null
    ), last as (
      select distinct on (contact_id) contact_id, at, text, from_me from timeline order by contact_id, at desc
    )
    select c.id, coalesce('@' || c.username, c.name, c.external_id) as who, ch.kind,
      l.at as last_at, l.text as last_text, l.from_me as last_from_me,
      coalesce(c.last_inbound_at > now() - interval '24 hours', false) as open, c.bot_paused
    from last l join contacts c on c.id = l.contact_id join channels ch on ch.id = c.channel_id
    order by l.at desc limit 100`;

  return (
    <div>
      <PageHeader title="Conversas" subtitle="Quem falou com a Aline. Toque para ver e responder." />
      {rows.length === 0 ? (
        <EmptyState icon={<IconComment className="h-7 w-7" />} title="Nenhuma conversa ainda"
          text="Quando alguém comentar ou mandar mensagem, aparece aqui." />
      ) : (
        <ul className="card divide-y divide-line p-0">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/conversas/${r.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-brand-50/50">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 font-bold uppercase text-brand-700">
                  {r.who.replace("@", "").slice(0, 1)}
                  <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5 text-muted">
                    {r.kind === "instagram" ? <IconInstagram className="h-3.5 w-3.5" /> : <IconWhatsapp className="h-3.5 w-3.5" />}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{r.who}</p>
                    <span className="shrink-0 text-[11px] text-muted">{fmtDate(r.last_at)}</span>
                  </div>
                  <p className="truncate text-sm text-muted">{r.last_from_me ? "Você: " : ""}{r.last_text ?? "(mídia)"}</p>
                  <div className="mt-1 flex gap-1.5">
                    {r.open && <span className="badge bg-green-50 text-green-700">pode responder</span>}
                    {r.bot_paused && <span className="badge bg-amber-50 text-amber-800">robô pausado</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
