import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({ res: z.enum(["1080p", "4k"]), original: z.string().url(), ia: z.string().url() });

// O administrador escolhe um resultado real para mostrar como demo na página de Créditos.
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u?.is_admin) return NextResponse.json({ error: "Só o administrador." }, { status: 403 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const { res, original, ia } = parsed.data;
  await db()`insert into rp_settings (key, value) values (${"demo_" + res}, ${db().json({ original, ia })})
    on conflict (key) do update set value = excluded.value`;
  return NextResponse.json({ ok: true });
}
