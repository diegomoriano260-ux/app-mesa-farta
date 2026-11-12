import type { InboundEvent } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Converte o corpo do webhook da Meta em eventos. Ignora o que não é texto
// (leituras, reações, status de entrega, etc.).
export function parseWebhook(body: any): InboundEvent[] {
  const out: InboundEvent[] = [];
  if (!body || !Array.isArray(body.entry)) return out;

  if (body.object === "instagram") {
    for (const entry of body.entry) {
      const accountId = String(entry.id ?? "");
      for (const ch of entry.changes ?? []) {
        if (ch.field !== "comments" || !ch.value) continue;
        const v = ch.value;
        if (!v.id || !v.from?.id) continue;
        out.push({
          kind: "ig_comment",
          channelKind: "instagram",
          accountId,
          eventId: String(v.id),
          fromId: String(v.from.id),
          fromUsername: v.from.username,
          text: String(v.text ?? ""),
          postId: v.media?.id ? String(v.media.id) : undefined,
          fromSelf: String(v.from.id) === accountId,
          raw: v,
        });
      }
      for (const m of entry.messaging ?? []) {
        const msg = m.message;
        if (!msg?.mid || typeof msg.text !== "string") continue;
        const isEcho = !!msg.is_echo || String(m.sender?.id) === accountId;
        out.push({
          kind: "ig_dm",
          channelKind: "instagram",
          accountId,
          eventId: String(msg.mid),
          fromId: String(isEcho ? m.recipient?.id : m.sender?.id),
          text: msg.text,
          fromSelf: isEcho,
          raw: m,
        });
      }
    }
  }

  if (body.object === "whatsapp_business_account") {
    for (const entry of body.entry) {
      for (const ch of entry.changes ?? []) {
        if (ch.field !== "messages" || !ch.value?.messages) continue;
        const v = ch.value;
        const accountId = String(v.metadata?.phone_number_id ?? "");
        const names = new Map<string, string>(
          (v.contacts ?? []).map((c: any) => [String(c.wa_id), c.profile?.name]),
        );
        for (const msg of v.messages) {
          const text =
            msg.type === "text" ? msg.text?.body :
            msg.type === "button" ? msg.button?.text :
            msg.type === "interactive" ? (msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title) :
            undefined;
          if (!msg.id || !msg.from || typeof text !== "string") continue;
          out.push({
            kind: "wa_message",
            channelKind: "whatsapp",
            accountId,
            eventId: String(msg.id),
            fromId: String(msg.from),
            fromName: names.get(String(msg.from)),
            text,
            fromSelf: false,
            raw: msg,
          });
        }
      }
    }
  }
  return out;
}
