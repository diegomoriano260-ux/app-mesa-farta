import { NextResponse } from "next/server";
import { currentUser, type User } from "./auth";
import { charge, SaldoInsuficiente } from "./credits";
import { brl } from "./pricing";

// Para rotas de API: exige login e cobra; devolve resposta de erro pronta quando não dá.
export async function payOrFail(cents: number, description: string, ref?: string):
  Promise<{ user: User; refund: () => Promise<void> } | { error: NextResponse }> {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "Faça login de novo." }, { status: 401 }) };
  try {
    const refund = await charge(user, cents, description, ref);
    return { user, refund };
  } catch (e) {
    if (e instanceof SaldoInsuficiente) {
      return { error: NextResponse.json({ error: `Saldo insuficiente: precisa de ${brl(e.need)} e você tem ${brl(e.have)}. Compre créditos em Créditos.`, code: "saldo" }, { status: 402 }) };
    }
    throw e;
  }
}
