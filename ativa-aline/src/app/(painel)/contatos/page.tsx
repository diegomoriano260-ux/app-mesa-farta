import Link from "next/link";
import { db } from "@/lib/db";
import { toggleBot } from "./actions";
import { EmptyState, fmtDate, PageHeader } from "@/components/ui";
import { IconInstagram, IconUsers, IconWhatsapp } from "@/components/icons";

export default async function Contatos({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  const sql = db();
  const [rows, tags] = await Promise.all([
    sql<{ id: string; name: string | null; username: string | null; external_id: string; kind: string; tags: string[]; bot_paused: boolean; last_seen: Date | null }[]>`
      select c.id, c.name, c.username, c.external_id, ch.kind, c.tags, c.bot_paused,
        (select max(received_at) from inbound_events e where e.contact_id = c.id) as last_seen
      from contacts c join channels ch on ch.id = c.channel_id
      ${tag ? sql`where ${tag} = any(c.tags)` : sql``}
      order by last_seen desc nulls last limit 200`,
    sql<{ tag: string; n: number }[]>`select unnest(tags) as tag, count(*)::int as n from contacts group by 1 order by 2 desc limit 20`,
  ]);

  return (
    <div>
      <PageHeader title="Contatos" subtitle="Todo mundo que interagiu com as automações." />
      {tags.length > 0 && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link href="/contatos" className={`badge shrink-0 py-1.5 ${!tag ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line"}`}>Todos</Link>
          {tags.map((t) => (
            <Link key={t.tag} href={`/contatos?tag=${encodeURIComponent(t.tag)}`}
              className={`badge shrink-0 py-1.5 ${tag === t.tag ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line"}`}>{t.tag} · {t.n}</Link>
          ))}
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState icon={<IconUsers className="h-7 w-7" />} title="Ninguém por aqui ainda"
          text="Quem comentar ou mandar mensagem com a palavra-chave aparece nesta lista." />
      ) : (
        <ul className="card divide-y divide-line p-0">
          {rows.map((c) => {
            const name = c.username ? `@${c.username}` : c.name ?? c.external_id;
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-bold uppercase text-brand-700">
                  {name.replace("@", "").slice(0, 1)}
                  <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5 text-muted">
                    {c.kind === "instagram" ? <IconInstagram className="h-3.5 w-3.5" /> : <IconWhatsapp className="h-3.5 w-3.5" />}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/conversas/${c.id}`} className="block truncate text-sm font-semibold hover:underline">{name}</Link>
                  <p className="text-xs text-muted">{fmtDate(c.last_seen)}</p>
                  {c.tags.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{c.tags.map((t) => <span key={t} className="chip py-0.5">{t}</span>)}</div>}
                </div>
                <form action={toggleBot}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className={`badge py-1.5 ${c.bot_paused ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700"}`}
                    title={c.bot_paused ? "O robô não responde essa pessoa. Toque para retomar." : "Toque para o robô parar de responder essa pessoa."}>
                    {c.bot_paused ? "robô pausado" : "robô ativo"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
