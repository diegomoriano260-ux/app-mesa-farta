"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { requireSession } from "@/lib/session";
import * as wa from "@/lib/meta/whatsapp";

export async function connectWhatsapp(_: { error?: string; ok?: string } | undefined, form: FormData) {
  await requireSession();
  const phoneNumberId = String(form.get("phone_number_id") ?? "").trim();
  const token = String(form.get("token") ?? "").trim();
  const wabaId = String(form.get("waba_id") ?? "").trim();
  if (!/^\d+$/.test(phoneNumberId)) return { error: "O ID do número de telefone tem só dígitos." };
  if (!token) return { error: "Cole o token do usuário do sistema." };

  let info;
  try {
    info = await wa.getPhoneNumber(token, phoneNumberId);
  } catch (e) {
    return { error: `A Meta recusou: ${e instanceof Error ? e.message : e}` };
  }
  if (wabaId) {
    try {
      await wa.subscribeWaba(token, wabaId);
    } catch (e) {
      return { error: `Número ok, mas não consegui assinar os webhooks da conta: ${e instanceof Error ? e.message : e}` };
    }
  }
  await db()`
    insert into channels (kind, external_id, display_name, access_token_enc, token_expires_at, status, last_error)
    values ('whatsapp', ${phoneNumberId}, ${`${info.verified_name} (${info.display_phone_number})`}, ${encrypt(token)}, null, 'connected', null)
    on conflict (kind, external_id) do update set
      display_name = excluded.display_name, access_token_enc = excluded.access_token_enc,
      status = 'connected', last_error = null`;
  revalidatePath("/canais");
  return { ok: `WhatsApp conectado: ${info.display_phone_number}` };
}

export async function disconnect(form: FormData) {
  await requireSession();
  await db()`update channels set status = 'disconnected' where id = ${String(form.get("id"))}`;
  revalidatePath("/canais");
}
