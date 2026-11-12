import Link from "next/link";
import { db } from "@/lib/db";

const kindLabel: Record<string, string> = {
  private_reply: "DM (comentário)", public_reply: "Resposta no post", dm: "DM", wa: "WhatsApp",
};

export default async function Painel() {
  const sql = db();
  const [[stats], recent, channels] = await Promise.all([
    sql<{ automations: number; contacts: number; sent7: number; failed7: number }[]>`
      select
        (select count(*)::int from automations where is_active) as automations,
        (select count(*)::int from contacts) as contacts,
        (select count(*)::int from dispatches where status = 'sent' and sent_at > now() - interval '7 days') as sent7,
        (select count(*)::int from dispatches where status = 'failed' and sent_at > now() - interval '7 days') as failed7`,
    sql<{ id: string; kind: string; status: string; error: string | null; sent_at: Date; automation: string | null; who: string | null }[]>`
      select d.id, d.kind, d.status, d.error, d.sent_at, a.name as automation,
        coalesce('@' || c.username, c.name, c.external_id) as who
      from dispatches d join contacts c on c.id = d.contact_id
      left join automations a on a.id = d.automation_id
      order by d.sent_at desc limit 15`,
    sql<{ kind: string; status: string }[]>`select kind, status from channels where status <> 'disconnected'`,
  ]);

  const tiles = [
    { label: "Automações ativas", value: stats.automations },
    { label: "Contatos", value: stats.contacts },
    { label: "Mensagens enviadas (7 dias)", value: stats.sent7 },
    { label: "Falhas (7 dias)", value: stats.failed7 },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Painel</h1>

      {channels.length === 0 && (
        <div className="card border-brand-100 bg-brand-50">
          <p className="font-medium">Comece conectando o Instagram da Aline.</p>
          <Link href="/canais" className="btn-primary mt-3">Conectar canais</Link>
        </div>
      )}
      {channels.some((c) => c.status !== "connected") && (
        <div className="card border-amber-200 bg-amber-50 text-amber-900">
          Um canal precisa ser reconectado. <Link href="/canais" className="underline">Ver canais</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card">
            <div className="text-3xl font-semibold tabular-nums">{t.value}</div>
            <div className="mt-1 text-sm text-neutral-500">{t.label}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Últimos envios</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-neutral-500">Nada enviado ainda.</p>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr><th className="px-4 py-2">Quando</th><th className="px-4 py-2">Para</th><th className="px-4 py-2">Automação</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Status</th></tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100">
                    <td className="whitespace-nowrap px-4 py-2">{r.sent_at.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                    <td className="px-4 py-2">{r.who}</td>
                    <td className="px-4 py-2">{r.automation ?? "—"}</td>
                    <td className="px-4 py-2">{kindLabel[r.kind] ?? r.kind}</td>
                    <td className="px-4 py-2">
                      {r.status === "sent"
                        ? <span className="badge bg-green-50 text-green-700">enviado</span>
                        : <span className="badge bg-red-50 text-red-700" title={r.error ?? ""}>falhou</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
