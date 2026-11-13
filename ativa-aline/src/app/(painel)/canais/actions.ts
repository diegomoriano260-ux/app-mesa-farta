"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { requireSession } from "@/lib/session";
import * as wa from "@/lib/meta/whatsapp";
import * as ig from "@/lib/meta/instagram";

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

// Conecta o Instagram colando o token gerado no painel da Meta
// ("Gerar tokens de acesso"). Tokens do login do Instagram começam com "IG".
export async function connectInstagramToken(_: { error?: string; ok?: string } | undefined, form: FormData) {
  await requireSession();
  const token = String(form.get("token") ?? "").trim().replace(/\s+/g, "");
  const igId = String(form.get("ig_account_id") ?? "").trim();
  if (!token) return { error: "Cole o token gerado no painel da Meta." };
  const fb = ig.isFbToken(token);
  if (fb && !/^\d+$/.test(igId)) {
    return { error: "Esse token (começa com EAA) precisa do ID da conta do Instagram: o número que aparece embaixo do nome da Aline no painel da Meta." };
  }
  let me;
  try {
    me = await ig.getAccount(token, igId);
  } catch (e) {
    return { error: `A Meta recusou o token: ${e instanceof Error ? e.message.slice(0, 200) : e}` };
  }
  let warn = "";
  try {
    await ig.subscribeWebhooks(token, String(me.user_id));
  } catch (e) {
    warn = ` (aviso: não consegui ativar os avisos automáticos por aqui: ${e instanceof Error ? e.message.slice(0, 120) : e})`;
  }
  // Token "IG..." dura ~60 dias e o cron renova. Token "EAA..." de usuário do sistema não expira.
  const expiresAt = fb ? null : new Date(Date.now() + 55 * 24 * 3600 * 1000);
  await db()`
    insert into channels (kind, external_id, display_name, access_token_enc, token_expires_at, status, last_error)
    values ('instagram', ${String(me.user_id)}, ${"@" + me.username}, ${encrypt(token)}, ${expiresAt}, 'connected', ${warn || null})
    on conflict (kind, external_id) do update set
      display_name = excluded.display_name, access_token_enc = excluded.access_token_enc,
      token_expires_at = excluded.token_expires_at, status = 'connected', last_error = excluded.last_error`;
  revalidatePath("/canais");
  revalidatePath("/");
  return { ok: `Instagram @${me.username} conectado!${warn}` };
}
