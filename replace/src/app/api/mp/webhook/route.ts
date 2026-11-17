import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/mercadopago";

export const runtime = "nodejs";

// Aviso do Mercado Pago. Não confiamos no corpo: o pagamento é conferido direto na API deles.
export async function POST(req: Request) {
  const u = new URL(req.url);
  let id = u.searchParams.get("data.id") ?? u.searchParams.get("id") ?? "";
  let type = u.searchParams.get("type") ?? u.searchParams.get("topic") ?? "";
  try {
    const b = (await req.json()) as { type?: string; data?: { id?: string | number } };
    id = String(b.data?.id ?? id);
    type = b.type ?? type;
  } catch { /* corpo vazio */ }
  if (type === "payment" && id) await confirmPayment(id);
  return NextResponse.json({ ok: true });
}
