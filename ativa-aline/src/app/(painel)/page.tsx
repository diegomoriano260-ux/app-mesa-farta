import Link from "next/link";
import { db } from "@/lib/db";
import { EmptyState, fmtDate, Notice } from "@/components/ui";
import { IconAlert, IconComment, IconInstagram, IconPlus, IconSend, IconSparkles, IconUsers, IconWhatsapp, IconZap } from "@/components/icons";

const kindInfo: Record<string, { label: string; Icon: typeof IconSend }> = {
  private_reply: { label: "Direct (comentário)", Icon: IconSend },
  public_reply: { label: "Resposta no post", Icon: IconComment },
  dm: { label: "Direct", Icon: IconSend },
  wa: { label: "WhatsApp", Icon: IconWhatsapp },
};

function greeting() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

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
      order by d.sent_at desc limit 12`,
    sql<{ kind: string; status: string; display_name: string | null }[]>`
      select kind, status, display_name from channels where status <> 'disconnected' order by kind`,
  ]);

  const tiles = [
    { label: "Automações ativas", value: stats.automations, Icon: IconZap },
    { label: "Contatos", value: stats.contacts, Icon: IconUsers },
    { label: "Enviadas em 7 dias", value: stats.sent7, Icon: IconSend },
    { label: "Falhas em 7 dias", value: stats.failed7, Icon: IconAlert },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-600">{greeting()}, Aline 👋</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight">Como está o seu Instagram hoje</h1>
        </div>
        <Link href="/automacoes/nova" className="btn-primary"><IconPlus className="h-[18px] w-[18px]" />Nova automação</Link>
      </div>

      {channels.length === 0 ? (
        <div className="card overflow-hidden bg-gradient-to-br from-brand-50 via-white to-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white"><IconInstagram className="h-6 w-6" /></div>
            <div className="flex-1">
              <p className="font-semibold">Primeiro passo: conecte o Instagram</p>
              <p className="text-sm text-muted">Depois disso você já pode criar a primeira resposta automática.</p>
            </div>
            <Link href="/canais" className="btn-primary">Conectar</Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {channels.map((c) => (
            <span key={c.kind + c.display_name} className={`badge py-1.5 ${c.status === "connected" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>
              {c.kind === "instagram" ? <IconInstagram className="h-4 w-4" /> : <IconWhatsapp className="h-4 w-4" />}
              {c.display_name} · {c.status === "connected" ? "conectado" : "reconectar"}
            </span>
          ))}
        </div>
      )}
      {channels.some((c) => c.status !== "connected") && (
        <Notice tone="warn">Um canal precisa ser reconectado. <Link href="/canais" className="font-semibold underline">Ver canais</Link></Notice>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {tiles.map(({ label, value, Icon }) => (
          <div key={label} className="card p-4 md:p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-[18px] w-[18px]" /></div>
            <div className="text-3xl font-bold tabular-nums tracking-tight">{value}</div>
            <div className="mt-0.5 text-sm text-muted">{label}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Últimos envios</h2>
        {recent.length === 0 ? (
          <EmptyState icon={<IconSparkles className="h-7 w-7" />} title="Nada enviado ainda"
            text="Quando alguém comentar ou mandar a palavra-chave, as respostas automáticas aparecem aqui." />
        ) : (
          <ul className="card divide-y divide-line p-0">
            {recent.map((r) => {
              const { label, Icon } = kindInfo[r.kind] ?? { label: r.kind, Icon: IconSend };
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.who}</p>
                    <p className="truncate text-xs text-muted">{label} · {r.automation ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    {r.status === "sent"
                      ? <span className="badge bg-green-50 text-green-700">enviado</span>
                      : <span className="badge bg-red-50 text-red-700" title={r.error ?? ""}>falhou</span>}
                    <p className="mt-1 text-[11px] text-muted">{fmtDate(r.sent_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
