import { redirect } from "next/navigation";
import { requireUser, saasMode } from "@/lib/auth";
import { db } from "@/lib/db";
import { confirmPayment } from "@/lib/mercadopago";
import { brl, PACKS, PRICES, SIGNUP_BONUS } from "@/lib/pricing";
import { CompareSlider } from "@/components/compare";
import { BuyButton } from "./buy";

export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { compra: "Compra", bonus: "Bônus", uso: "Uso", estorno: "Devolução", ajuste: "Ajuste" };

export default async function Creditos({ searchParams }: { searchParams: Promise<{ payment_id?: string; pagamento?: string }> }) {
  const sp = await searchParams;
  if (!saasMode()) redirect("/");
  // volta do Mercado Pago: confere na hora (o aviso automático também chega pelo webhook)
  // e recarrega sem o id, para o saldo do topo já aparecer atualizado
  if (sp.payment_id && process.env.MP_ACCESS_TOKEN) {
    const r = await confirmPayment(sp.payment_id);
    redirect(`/creditos?pagamento=${r}`);
  }
  const aviso = sp.pagamento === "aprovado" ? "Pagamento aprovado! Os créditos já estão na sua conta."
    : sp.pagamento === "pendente" ? "Pagamento em análise. Os créditos entram assim que for aprovado (Pix costuma ser na hora)."
    : sp.pagamento === "recusado" ? "O pagamento não foi aprovado." : null;
  const u = await requireUser();
  const sql = db();
  const [ledger, demos] = await Promise.all([
    sql<{ amount_cents: number; kind: string; description: string; created_at: Date }[]>`
      select amount_cents, kind, description, created_at from rp_ledger where user_id = ${u.id} order by created_at desc limit 50`,
    sql<{ key: string; value: { original: string; ia: string } }[]>`select key, value from rp_settings where key like 'demo_%'`,
  ]);
  const demo = (k: string) => demos.find((d) => d.key === k)?.value;
  const precos: [string, string][] = [
    ["Transcrição", `${brl(PRICES.transcricaoPorMinuto)} por minuto de vídeo`],
    ["Resumo + sugestão de clipes", `${brl(PRICES.analise)} por vídeo`],
    ["Pergunta, modelo pronto ou busca de momentos", `${brl(PRICES.ia)} cada`],
    ["Tradução de legendas", `${brl(PRICES.traducaoPorLote)} a cada 150 frases`],
    ["Editar e exportar clipes (720p, 1080p, 4K)", "grátis"],
    ["Super-resolução IA 1080p", `${brl(PRICES.upscale1080Por5s)} a cada 5 segundos`],
    ["Super-resolução IA 4K", `${brl(PRICES.upscale4kPor5s)} a cada 5 segundos`],
  ];

  return (
    <div className="space-y-6">
      {aviso && <div className="card border-green-200 bg-green-50 text-green-800">{aviso}</div>}
      <div className="card flex flex-wrap items-center gap-4 bg-gradient-to-br from-brand-50 to-white">
        <div className="flex-1">
          <p className="text-sm text-muted">Seu saldo</p>
          <p className="text-4xl font-black tracking-tight">{u.is_admin ? "Ilimitado" : brl(u.balance_cents)}</p>
        </div>
        <p className="max-w-xs text-sm text-muted">Créditos não expiram. Se uma IA falhar, o valor volta automaticamente.</p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Comprar créditos</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {PACKS.map((p) => (
            <div key={p.id} className={`card space-y-3 ${p.id === "p50" ? "border-brand-400 ring-4 ring-brand-100" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="font-bold">{p.nome}</p>
                {p.destaque && <span className="badge bg-green-50 text-green-700">{p.destaque}</span>}
              </div>
              <p className="text-3xl font-black">{brl(p.price)}</p>
              <p className="text-sm text-muted">Você recebe <b className="text-ink">{brl(p.credit)}</b> em créditos</p>
              <BuyButton pack={p.id} label="Comprar com Pix ou cartão" />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Pagamento seguro pelo Mercado Pago. Contas novas ganham {brl(SIGNUP_BONUS)} para testar.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Veja a diferença da super-resolução</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {(["1080p", "4k"] as const).map((r) => {
            const d = demo(`demo_${r}`);
            return (
              <div key={r} className="card space-y-3">
                <p className="text-center font-bold">{r === "4k" ? "4K Ultra HD" : "1080p Full HD"}</p>
                {d ? <CompareSlider before={d.original} after={d.ia} labelAfter={`IA ${r === "4k" ? "4K" : "1080p"}`} />
                  : <div className="flex aspect-[9/16] max-h-80 w-full items-center justify-center rounded-2xl bg-canvas p-6 text-center text-sm text-muted">Demonstração em breve.</div>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">Quanto custa cada coisa</h2>
        <ul className="divide-y divide-line text-sm">
          {precos.map(([a, b]) => <li key={a} className="flex justify-between gap-4 py-2"><span>{a}</span><span className="text-right font-semibold">{b}</span></li>)}
        </ul>
        <p className="text-xs text-muted">Exemplo: um vídeo de 30 minutos com resumo e clipes sai por {brl(30 * PRICES.transcricaoPorMinuto + PRICES.analise)}.</p>
      </section>

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">Extrato</h2>
        {ledger.length === 0 ? <p className="text-sm text-muted">Nada por aqui ainda.</p> : (
          <ul className="divide-y divide-line text-sm">
            {ledger.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate">{l.description}</p>
                  <p className="text-xs text-muted">{KIND[l.kind]} · {l.created_at.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <span className={`shrink-0 font-semibold ${l.amount_cents >= 0 ? "text-green-700" : ""}`}>{l.amount_cents >= 0 ? "+" : ""}{brl(l.amount_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
