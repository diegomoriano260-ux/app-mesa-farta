import Link from "next/link";
import { db } from "@/lib/db";
import { toggleAutomation } from "./actions";
import { EmptyState, PageHeader } from "@/components/ui";
import { IconChevron, IconComment, IconPlus, IconSend, IconWhatsapp, IconZap } from "@/components/icons";

const triggerInfo: Record<string, { label: string; Icon: typeof IconComment }> = {
  ig_comment: { label: "Comentário no post", Icon: IconComment },
  ig_dm: { label: "Mensagem no Direct", Icon: IconSend },
  wa_message: { label: "Mensagem no WhatsApp", Icon: IconWhatsapp },
};

export default async function Automacoes() {
  const rows = await db()<{ id: string; name: string; trigger: string; keywords: string[]; post_id: string | null; is_active: boolean; sent: number }[]>`
    select a.id, a.name, a.trigger, a.keywords, a.post_id, a.is_active,
      (select count(*)::int from dispatches d where d.automation_id = a.id and d.status = 'sent') as sent
    from automations a order by a.created_at desc`;

  return (
    <div>
      <PageHeader title="Automações" subtitle="Respostas que saem sozinhas quando alguém usa uma palavra-chave."
        action={<Link href="/automacoes/nova" className="btn-primary"><IconPlus className="h-[18px] w-[18px]" />Nova</Link>} />
      {rows.length === 0 ? (
        <EmptyState icon={<IconZap className="h-7 w-7" />} title="Nenhuma automação ainda"
          text='Exemplo: quem comentar "QUERO" no post recebe o link na hora, no Direct.'
          href="/automacoes/nova" cta="Criar a primeira" />
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => {
            const { label, Icon } = triggerInfo[a.trigger];
            return (
              <li key={a.id} className={`card flex items-center gap-4 p-4 transition ${a.is_active ? "" : "opacity-70"}`}>
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${a.is_active ? "bg-brand-50 text-brand-600" : "bg-neutral-100 text-muted"}`}><Icon /></div>
                <Link href={`/automacoes/${a.id}`} className="group min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate font-semibold">{a.name}<IconChevron className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5" /></p>
                  <p className="mt-0.5 text-xs text-muted">
                    {label}{a.trigger === "ig_comment" && (a.post_id ? " · 1 post" : " · qualquer post")} · {a.sent} enviada{a.sent === 1 ? "" : "s"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.keywords.length ? a.keywords.slice(0, 5).map((k) => <span key={k} className="chip">{k}</span>)
                      : <span className="chip bg-neutral-100 text-muted">qualquer texto</span>}
                  </div>
                </Link>
                <form action={toggleAutomation}>
                  <input type="hidden" name="id" value={a.id} />
                  <button role="switch" aria-checked={a.is_active} title={a.is_active ? "Pausar" : "Ativar"}
                    className={`relative h-7 w-12 rounded-full transition ${a.is_active ? "bg-brand-600" : "bg-neutral-300"}`}>
                    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${a.is_active ? "left-[22px]" : "left-0.5"}`} />
                    <span className="sr-only">{a.is_active ? "Pausar" : "Ativar"}</span>
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
