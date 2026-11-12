import { db } from "@/lib/db";
import { toggleBot } from "./actions";

export default async function Contatos({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  const rows = await db()<{ id: string; name: string | null; username: string | null; external_id: string; kind: string; tags: string[]; bot_paused: boolean; last_seen: Date | null }[]>`
    select c.id, c.name, c.username, c.external_id, ch.kind, c.tags, c.bot_paused,
      (select max(received_at) from inbound_events e where e.contact_id = c.id) as last_seen
    from contacts c join channels ch on ch.id = c.channel_id
    ${tag ? db()`where ${tag} = any(c.tags)` : db()``}
    order by last_seen desc nulls last limit 200`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Contatos{tag && <span className="text-neutral-500"> · {tag}</span>}</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">Ninguém interagiu ainda.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr><th className="px-4 py-2">Contato</th><th className="px-4 py-2">Canal</th><th className="px-4 py-2">Etiquetas</th><th className="px-4 py-2">Última interação</th><th className="px-4 py-2">Robô</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">{c.username ? `@${c.username}` : c.name ?? c.external_id}</td>
                  <td className="px-4 py-2">{c.kind === "instagram" ? "Instagram" : "WhatsApp"}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => <a key={t} href={`/contatos?tag=${encodeURIComponent(t)}`} className="badge bg-brand-50 text-brand-700">{t}</a>)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">{c.last_seen?.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) ?? "—"}</td>
                  <td className="px-4 py-2">
                    <form action={toggleBot}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-xs underline" title="Pausado = o robô não responde essa pessoa">
                        {c.bot_paused ? "pausado · retomar" : "ativo · pausar"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
