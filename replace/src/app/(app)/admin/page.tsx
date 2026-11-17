import { redirect } from "next/navigation";
import { requireUser, saasMode } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl } from "@/lib/pricing";
import { darCreditos } from "./actions";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const me = await requireUser();
  if (!me.is_admin || !saasMode()) redirect("/");
  const sql = db();
  const [[tot], users, compras] = await Promise.all([
    sql<{ clientes: number; vendido: number; uso30: number; saldo: number }[]>`
      select (select count(*)::int from rp_users where not is_admin) as clientes,
        (select coalesce(sum(price_cents),0)::int from rp_purchases where status = 'aprovado') as vendido,
        (select coalesce(-sum(amount_cents),0)::int from rp_ledger where kind = 'uso' and created_at > now() - interval '30 days') as uso30,
        (select coalesce(sum(balance_cents),0)::int from rp_users where not is_admin) as saldo`,
    sql<{ id: string; email: string; name: string | null; balance_cents: number; created_at: Date; gasto: number }[]>`
      select u.id, u.email, u.name, u.balance_cents, u.created_at,
        coalesce((select -sum(amount_cents) from rp_ledger l where l.user_id = u.id and l.kind = 'uso'), 0)::int as gasto
      from rp_users u where not u.is_admin order by u.created_at desc limit 200`,
    sql<{ email: string; pack: string; price_cents: number; status: string; created_at: Date }[]>`
      select u.email, p.pack, p.price_cents, p.status, p.created_at from rp_purchases p join rp_users u on u.id = p.user_id order by p.created_at desc limit 30`,
  ]);
  const fmt = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="space-y-6">
      <h1 className="text-[26px] font-bold tracking-tight">Administração</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Clientes", String(tot.clientes)], ["Vendido (total)", brl(tot.vendido)], ["Uso nos últimos 30 dias", brl(tot.uso30)], ["Saldo dos clientes", brl(tot.saldo)]].map(([l, v]) => (
          <div key={l} className="card p-4"><p className="text-2xl font-black">{v}</p><p className="text-sm text-muted">{l}</p></div>
        ))}
      </div>
      <section className="card space-y-3">
        <h2 className="font-bold">Clientes</h2>
        {users.length === 0 ? <p className="text-sm text-muted">Nenhum cliente ainda.</p> : (
          <ul className="divide-y divide-line text-sm">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{u.name ?? u.email}</p>
                  <p className="truncate text-xs text-muted">{u.email} · desde {fmt(u.created_at)} · gastou {brl(u.gasto)}</p>
                </div>
                <span className="font-semibold">{brl(u.balance_cents)}</span>
                <form action={darCreditos} className="flex gap-1">
                  <input type="hidden" name="id" value={u.id} />
                  <input name="valor" className="input w-20 py-1.5 text-sm" placeholder="R$" inputMode="decimal" />
                  <button className="btn-secondary px-3 py-1.5 text-xs">Dar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card space-y-3">
        <h2 className="font-bold">Últimas compras</h2>
        {compras.length === 0 ? <p className="text-sm text-muted">Nenhuma compra ainda.</p> : (
          <ul className="divide-y divide-line text-sm">
            {compras.map((c, i) => (
              <li key={i} className="flex justify-between gap-3 py-2"><span className="truncate">{c.email} · {c.pack} · {fmt(c.created_at)}</span>
                <span className={c.status === "aprovado" ? "font-semibold text-green-700" : "text-muted"}>{brl(c.price_cents)} · {c.status}</span></li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted">Para escolher a demo da página de Créditos: melhore um clipe com IA e toque em “Usar como demo”.</p>
    </div>
  );
}
