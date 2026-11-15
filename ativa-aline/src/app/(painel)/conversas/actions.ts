"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { requireSession } from "@/lib/session";
import * as ig from "@/lib/meta/instagram";
import * as wa from "@/lib/meta/whatsapp";

const WINDOW_MS = 24 * 3600 * 1000;

export async function sendManual(_: { error?: string } | undefined, form: FormData) {
  await requireSession();
  const contactId = String(form.get("contact_id") ?? "");
  const text = String(form.get("text") ?? "").trim();
  if (!text) return { error: "Escreva a mensagem." };
  if (text.length > 1000) return { error: "No máximo 1000 caracteres." };
  const sql = db();
  const [c] = await sql<{ id: string; external_id: string; last_inbound_at: Date | null; kind: string; channel_ext: string; token: string }[]>`
    select c.id, c.external_id, c.last_inbound_at, ch.kind, ch.external_id as channel_ext, ch.access_token_enc as token
    from contacts c join channels ch on ch.id = c.channel_id where c.id = ${contactId}`;
  if (!c) return { error: "Contato não encontrado." };
  if (!c.last_inbound_at || Date.now() - c.last_inbound_at.getTime() > WINDOW_MS) {
    return { error: "A janela de 24 horas está fechada: a Meta só deixa responder até 24h depois da última mensagem da pessoa." };
  }
  const content = { kind: "text" as const, text };
  let error: string | null = null;
  try {
    const token = decrypt(c.token);
    if (c.kind === "instagram") await ig.sendMessage(token, c.channel_ext, { id: c.external_id }, content);
    else await wa.sendMessage(token, c.channel_ext, c.external_id, content);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  await sql`
    insert into dispatches (contact_id, kind, status, error, content)
    values (${c.id}, 'manual', ${error ? "failed" : "sent"}, ${error}, ${sql.json(content)})`;
  revalidatePath(`/conversas/${c.id}`);
  return error ? { error: `A Meta recusou: ${error.slice(0, 200)}` } : undefined;
}

export async function toggleBotHere(form: FormData) {
  await requireSession();
  const id = String(form.get("id"));
  await db()`update contacts set bot_paused = not bot_paused where id = ${id}`;
  revalidatePath(`/conversas/${id}`);
}
