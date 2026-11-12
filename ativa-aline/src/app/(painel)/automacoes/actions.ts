"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { parseKeywords } from "@/lib/text";
import type { MessageContent, Trigger } from "@/lib/meta/types";

export type FormState = { error?: string } | undefined;

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const isUrl = (s: string) => {
  try { return ["https:", "http:"].includes(new URL(s).protocol); } catch { return false; }
};

function readMessages(form: FormData): MessageContent[] | string {
  const out: MessageContent[] = [];
  for (let i = 0; i < 3; i++) {
    const kind = String(form.get(`m${i}_kind`) ?? "");
    const text = String(form.get(`m${i}_text`) ?? "").trim();
    if (kind === "text") {
      if (!text) continue;
      if (text.length > 1000) return `Mensagem ${i + 1}: no máximo 1000 caracteres.`;
      out.push({ kind: "text", text });
    } else if (kind === "image") {
      const url = String(form.get(`m${i}_url`) ?? "").trim();
      if (!url) continue;
      if (!isUrl(url)) return `Mensagem ${i + 1}: o link da imagem não é válido.`;
      out.push({ kind: "image", url });
    } else if (kind === "buttons") {
      const buttons: { title: string; url: string }[] = [];
      for (let b = 0; b < 3; b++) {
        const title = String(form.get(`m${i}_b${b}_title`) ?? "").trim();
        const url = String(form.get(`m${i}_b${b}_url`) ?? "").trim();
        if (!title && !url) continue;
        if (!title || !url) return `Mensagem ${i + 1}, botão ${b + 1}: preencha o nome e o link.`;
        if (title.length > 20) return `Mensagem ${i + 1}, botão ${b + 1}: nome com no máximo 20 caracteres.`;
        if (!isUrl(url)) return `Mensagem ${i + 1}, botão ${b + 1}: link inválido (use https://...).`;
        buttons.push({ title, url });
      }
      if (!text && buttons.length === 0) continue;
      if (!text) return `Mensagem ${i + 1}: escreva o texto que vai acima dos botões.`;
      if (text.length > 640) return `Mensagem ${i + 1}: texto com botões tem no máximo 640 caracteres.`;
      if (buttons.length === 0) return `Mensagem ${i + 1}: adicione pelo menos um botão.`;
      out.push({ kind: "buttons", text, buttons });
    }
  }
  return out;
}

export async function saveAutomation(_: FormState, form: FormData): Promise<FormState> {
  await requireSession();
  const sql = db();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const channelId = String(form.get("channel_id") ?? "");
  const trigger = String(form.get("trigger") ?? "") as Trigger;
  const postId = String(form.get("post_id") ?? "").trim() || null;
  const keywords = parseKeywords(String(form.get("keywords") ?? ""));
  const matchMode = form.get("match_mode") === "exact" ? "exact" : "contains";
  const publicReply = String(form.get("public_reply") ?? "").trim() || null;
  const tag = String(form.get("tag_to_add") ?? "").trim().toLowerCase() || null;
  const priority = Number(form.get("priority") ?? 0) || 0;
  const isActive = form.get("is_active") === "on";

  if (!name) return { error: "Dê um nome para a automação." };
  if (!["ig_comment", "ig_dm", "wa_message"].includes(trigger)) return { error: "Escolha o gatilho." };
  if (!isUuid(channelId)) return { error: "Escolha o canal." };
  const [ch] = await sql<{ kind: string }[]>`select kind from channels where id = ${channelId} and status <> 'disconnected'`;
  if (!ch) return { error: "Canal não encontrado." };
  if ((trigger === "wa_message") !== (ch.kind === "whatsapp")) return { error: "Esse gatilho não combina com esse canal." };
  const messages = readMessages(form);
  if (typeof messages === "string") return { error: messages };
  if (messages.length === 0) return { error: "Escreva pelo menos uma mensagem." };

  const isComment = trigger === "ig_comment";
  let savedId = id;
  await sql.begin(async (tx) => {
    const values = {
      name, channel_id: channelId, trigger,
      post_id: isComment ? postId : null,
      keywords, match_mode: matchMode,
      public_reply: isComment ? publicReply : null,
      tag_to_add: tag, priority, is_active: isActive,
    };
    if (id && isUuid(id)) {
      await tx`update automations set ${tx(values)} where id = ${id}`;
      await tx`delete from automation_messages where automation_id = ${id}`;
    } else {
      [{ id: savedId }] = await tx<{ id: string }[]>`insert into automations ${tx(values)} returning id`;
    }
    for (const [position, m] of messages.entries()) {
      const { kind, ...content } = m;
      await tx`insert into automation_messages (automation_id, position, kind, content)
               values (${savedId}, ${position}, ${kind}, ${tx.json(content)})`;
    }
  });
  revalidatePath("/automacoes");
  redirect("/automacoes");
}

export async function toggleAutomation(form: FormData) {
  await requireSession();
  await db()`update automations set is_active = not is_active where id = ${String(form.get("id"))}`;
  revalidatePath("/automacoes");
}

export async function deleteAutomation(form: FormData) {
  await requireSession();
  await db()`delete from automations where id = ${String(form.get("id"))}`;
  revalidatePath("/automacoes");
  redirect("/automacoes");
}
