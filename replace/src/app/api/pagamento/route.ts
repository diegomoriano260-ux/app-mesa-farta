import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createCheckout } from "@/lib/mercadopago";
import { PACKS, type PackId } from "@/lib/pricing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  if (!process.env.MP_ACCESS_TOKEN) return NextResponse.json({ error: "Os pagamentos ainda não foram ativados neste app." }, { status: 503 });
  const { pack } = (await req.json()) as { pack?: string };
  if (!PACKS.some((p) => p.id === pack)) return NextResponse.json({ error: "Pacote inválido." }, { status: 400 });
  try {
    const url = await createCheckout(user.id, user.email, pack as PackId);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
