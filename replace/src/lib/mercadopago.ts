import { db } from "./db";
import { env } from "./env";
import { credit } from "./credits";
import { PACKS, type PackId } from "./pricing";

const MP = () => (process.env.MP_BASE_URL || "https://api.mercadopago.com").replace(/\/+$/, "");
const auth = () => ({ Authorization: `Bearer ${env("MP_ACCESS_TOKEN")}`, "Content-Type": "application/json" });
export const appUrl = () => env("APP_URL").replace(/\/+$/, "");

// Cria a compra pendente e o link de pagamento do Mercado Pago (Pix, cartão, boleto).
export async function createCheckout(userId: string, email: string, packId: PackId): Promise<string> {
  const pack = PACKS.find((p) => p.id === packId);
  if (!pack) throw new Error("Pacote inválido.");
  const sql = db();
  const [purchase] = await sql<{ id: string }[]>`
    insert into rp_purchases (user_id, pack, price_cents, credit_cents) values (${userId}, ${pack.id}, ${pack.price}, ${pack.credit}) returning id`;
  const res = await fetch(`${MP()}/checkout/preferences`, {
    method: "POST",
    headers: { ...auth(), "X-Idempotency-Key": purchase.id },
    body: JSON.stringify({
      items: [{ id: pack.id, title: `Replace - créditos ${pack.nome}`, quantity: 1, unit_price: pack.price / 100, currency_id: "BRL" }],
      payer: email.includes("@") ? { email } : undefined,
      external_reference: purchase.id,
      notification_url: `${appUrl()}/api/mp/webhook`,
      back_urls: { success: `${appUrl()}/creditos`, pending: `${appUrl()}/creditos`, failure: `${appUrl()}/creditos` },
      auto_return: "approved",
      statement_descriptor: "REPLACE",
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Mercado Pago recusou (${res.status}): ${text.slice(0, 200)}`);
  const pref = JSON.parse(text) as { id: string; init_point: string };
  await sql`update rp_purchases set mp_preference_id = ${pref.id} where id = ${purchase.id}`;
  return pref.init_point;
}

// Confere o pagamento direto na API do Mercado Pago e libera os créditos uma única vez.
export async function confirmPayment(paymentId: string): Promise<"aprovado" | "pendente" | "recusado" | "ignorado"> {
  if (!/^\d+$/.test(paymentId)) return "ignorado";
  const res = await fetch(`${MP()}/v1/payments/${paymentId}`, { headers: auth(), cache: "no-store" });
  if (!res.ok) return "ignorado";
  const pay = (await res.json()) as { status: string; external_reference?: string; transaction_amount?: number };
  const ref = pay.external_reference ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(ref)) return "ignorado";
  const sql = db();
  const [purchase] = await sql<{ id: string; user_id: string; price_cents: number; credit_cents: number; status: string; pack: string }[]>`
    select id, user_id, price_cents, credit_cents, status, pack from rp_purchases where id = ${ref}`;
  if (!purchase) return "ignorado";
  if (pay.status === "approved") {
    if (Math.round((pay.transaction_amount ?? 0) * 100) < purchase.price_cents) return "ignorado"; // valor não confere
    const [won] = await sql<{ id: string }[]>`
      update rp_purchases set status = 'aprovado', mp_payment_id = ${paymentId}, updated_at = now()
      where id = ${purchase.id} and status <> 'aprovado' returning id`;
    if (won) await credit(purchase.user_id, purchase.credit_cents, "compra", `Compra do pacote ${purchase.pack}`, `mp:${paymentId}`);
    return "aprovado";
  }
  if (["rejected", "cancelled", "refunded", "charged_back"].includes(pay.status)) {
    await sql`update rp_purchases set status = 'recusado', updated_at = now() where id = ${purchase.id} and status = 'pendente'`;
    return "recusado";
  }
  return "pendente";
}
