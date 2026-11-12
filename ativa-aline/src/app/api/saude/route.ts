import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Diagnóstico público: diz se o banco responde e mostra o tipo de erro.
// Nunca mostra a DATABASE_URL nem a senha.
export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  let parsed: URL | null = null;
  try { parsed = new URL(url); } catch { /* inválida */ }
  const info = {
    database_url_definida: !!url,
    database_url_valida: !!parsed,
    host: parsed?.hostname ?? null,
    porta: parsed?.port ?? null,
    usuario: parsed ? decodeURIComponent(parsed.username) : null,
    senha_tem_colchetes_ou_espaco: parsed ? /[\[\]\s]|%20|%5B|%5D/i.test(parsed.password) : null,
  };
  try {
    const [r] = await db()<{ tabelas: number }[]>`
      select count(*)::int as tabelas from information_schema.tables
      where table_schema = 'public' and table_name in
        ('channels','automations','automation_messages','contacts','inbound_events','dispatches')`;
    return NextResponse.json({ banco: "ok", tabelas_encontradas: r.tabelas, ...info });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const msg = (err.message ?? String(e)).replaceAll(url, "[DATABASE_URL]");
    return NextResponse.json({ banco: "erro", codigo: err.code ?? null, mensagem: msg.slice(0, 300), ...info }, { status: 500 });
  }
}
