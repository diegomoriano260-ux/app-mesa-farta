import { db } from "./db";
import type { User } from "./auth";

export class SaldoInsuficiente extends Error {
  constructor(public need: number, public have: number) { super("Saldo insuficiente"); }
}

// Debita antes de chamar a IA. Admin não paga. Devolve uma função para estornar se a IA falhar.
export async function charge(u: User, cents: number, description: string, ref?: string): Promise<() => Promise<void>> {
  if (u.is_admin || cents <= 0) return async () => {};
  const sql = db();
  const rows = await sql.begin(async (tx) => {
    const r = await tx<{ balance_cents: number }[]>`
      update rp_users set balance_cents = balance_cents - ${cents}
      where id = ${u.id} and balance_cents >= ${cents} returning balance_cents`;
    if (!r.length) return r;
    await tx`insert into rp_ledger (user_id, amount_cents, kind, description, ref) values (${u.id}, ${-cents}, 'uso', ${description}, ${ref ?? null})`;
    return r;
  });
  if (!rows.length) {
    const [cur] = await sql<{ balance_cents: number }[]>`select balance_cents from rp_users where id = ${u.id}`;
    throw new SaldoInsuficiente(cents, cur?.balance_cents ?? 0);
  }
  return async () => {
    await sql.begin(async (tx) => {
      await tx`update rp_users set balance_cents = balance_cents + ${cents} where id = ${u.id}`;
      await tx`insert into rp_ledger (user_id, amount_cents, kind, description, ref) values (${u.id}, ${cents}, 'estorno', ${"Estorno: " + description}, ${ref ?? null})`;
    });
  };
}

export async function credit(userId: string, cents: number, kind: "compra" | "bonus" | "ajuste", description: string, ref?: string) {
  await db().begin(async (tx) => {
    await tx`update rp_users set balance_cents = balance_cents + ${cents} where id = ${userId}`;
    await tx`insert into rp_ledger (user_id, amount_cents, kind, description, ref) values (${userId}, ${cents}, ${kind}, ${description}, ${ref ?? null})`;
  });
}
