import Link from "next/link";
import { db } from "@/lib/db";
import { toggleAutomation } from "./actions";

const triggerLabel: Record<string, string> = {
  ig_comment: "Comentário no Instagram", ig_dm: "Direct do Instagram", wa_message: "WhatsApp",
};

export default async function Automacoes() {
  const rows = await db()<{ id: string; name: string; trigger: string; keywords: string[]; post_id: string | null; is_active: boolean; sent: number }[]>`
    select a.id, a.name, a.trigger, a.keywords, a.post_id, a.is_active,
      (select count(*)::int from dispatches d where d.automation_id = a.id and d.status = 'sent') as sent
    from automations a order by a.is_active desc, a.priority desc, a.created_at desc`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Automações</h1>
        <Link href="/automacoes/nova" className="btn-primary">Nova automação</Link>
      </div>
      {rows.length === 0 ? (
        <div className="card text-center text-neutral-600">
          <p>Nenhuma automação ainda.</p>
          <p className="mt-1 text-sm">Exemplo: quem comentar <b>QUERO</b> recebe o link no direct.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center gap-4">
              <Link href={`/automacoes/${a.id}`} className="min-w-0 flex-1">
                <div className="font-medium hover:underline">{a.name}</div>
                <div className="mt-1 text-xs text-neutral-500">
                  {triggerLabel[a.trigger]}{a.trigger === "ig_comment" && (a.post_id ? " · um post" : " · qualquer post")}
                  {" · "}{a.keywords.length ? a.keywords.join(", ") : "qualquer texto"}
                  {" · "}{a.sent} enviada{a.sent === 1 ? "" : "s"}
                </div>
              </Link>
              <form action={toggleAutomation}>
                <input type="hidden" name="id" value={a.id} />
                <button className={a.is_active ? "btn-secondary" : "btn-primary"}>{a.is_active ? "Pausar" : "Ativar"}</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
