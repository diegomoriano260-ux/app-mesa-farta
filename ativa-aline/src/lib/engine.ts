import { db } from "./db";
import { decrypt } from "./crypto";
import { matchesKeywords } from "./text";
import * as ig from "./meta/instagram";
import * as wa from "./meta/whatsapp";
import type { InboundEvent, MessageContent, Trigger } from "./meta/types";

export type AutomationRow = {
  id: string;
  trigger: Trigger;
  post_id: string | null;
  keywords: string[];
  match_mode: "contains" | "exact";
  public_reply: string | null;
  tag_to_add: string | null;
  messages: MessageContent[];
};

// Escolhe a automação: a lista já vem ordenada por prioridade.
export function pickAutomation(ev: Pick<InboundEvent, "kind" | "text" | "postId">, list: AutomationRow[]): AutomationRow | undefined {
  return list.find(
    (a) =>
      a.trigger === ev.kind &&
      (!a.post_id || a.post_id === ev.postId) &&
      matchesKeywords(ev.text, a.keywords, a.match_mode),
  );
}

// Planeja os envios. Comentário: só UMA private reply é permitida, então vai só a 1ª mensagem;
// o resto da conversa continua quando a pessoa responder na DM.
export type Step =
  | { kind: "public_reply"; text: string }
  | { kind: "private_reply"; content: MessageContent }
  | { kind: "dm"; content: MessageContent }
  | { kind: "wa"; content: MessageContent };

export function planSteps(ev: Pick<InboundEvent, "kind">, a: AutomationRow): Step[] {
  if (ev.kind === "ig_comment") {
    const steps: Step[] = [];
    if (a.public_reply) steps.push({ kind: "public_reply", text: a.public_reply });
    if (a.messages[0]) steps.push({ kind: "private_reply", content: a.messages[0] });
    return steps;
  }
  if (ev.kind === "ig_dm") return a.messages.map((content) => ({ kind: "dm", content }));
  return a.messages.map((content) => ({ kind: "wa", content }));
}

export type HandleResult =
  | "no_channel" | "self" | "duplicate" | "bot_paused" | "no_match" | "handled";

export async function handleEvent(ev: InboundEvent): Promise<HandleResult> {
  const sql = db();
  const [channel] = await sql<{ id: string; access_token_enc: string; external_id: string }[]>`
    select id, access_token_enc, external_id from channels
    where kind = ${ev.channelKind} and external_id = ${ev.accountId} and status <> 'disconnected'`;
  if (!channel) return "no_channel";
  if (ev.fromSelf) return "self";

  const isMessage = ev.kind !== "ig_comment";
  const [contact] = await sql<{ id: string; bot_paused: boolean }[]>`
    insert into contacts (channel_id, external_id, name, username, last_inbound_at)
    values (${channel.id}, ${ev.fromId}, ${ev.fromName ?? null}, ${ev.fromUsername ?? null},
            ${isMessage ? sql`now()` : null})
    on conflict (channel_id, external_id) do update set
      name = coalesce(excluded.name, contacts.name),
      username = coalesce(excluded.username, contacts.username),
      last_inbound_at = coalesce(excluded.last_inbound_at, contacts.last_inbound_at)
    returning id, bot_paused`;

  const [inbound] = await sql<{ id: string }[]>`
    insert into inbound_events (channel_id, contact_id, kind, external_event_id, text, post_id, payload)
    values (${channel.id}, ${contact.id}, ${ev.kind}, ${ev.eventId}, ${ev.text}, ${ev.postId ?? null},
            ${sql.json(ev.raw as never)})
    on conflict (channel_id, external_event_id) do nothing
    returning id`;
  if (!inbound) return "duplicate"; // a Meta reenviou o mesmo evento
  if (contact.bot_paused) return "bot_paused";

  const automations = await sql<AutomationRow[]>`
    select a.id, a.trigger, a.post_id, a.keywords, a.match_mode, a.public_reply, a.tag_to_add,
      coalesce((select jsonb_agg(m.content || jsonb_build_object('kind', m.kind) order by m.position)
                from automation_messages m where m.automation_id = a.id), '[]'::jsonb) as messages
    from automations a
    where a.channel_id = ${channel.id} and a.trigger = ${ev.kind} and a.is_active
    order by a.priority desc, a.created_at asc`;
  const a = pickAutomation(ev, automations);
  if (!a) return "no_match";

  const token = decrypt(channel.access_token_enc);
  for (const step of planSteps(ev, a)) {
    let error: string | null = null;
    try {
      switch (step.kind) {
        case "public_reply":
          await ig.replyToComment(token, ev.eventId, step.text);
          break;
        case "private_reply":
          await ig.sendMessage(token, channel.external_id, { comment_id: ev.eventId }, step.content);
          break;
        case "dm":
          await ig.sendMessage(token, channel.external_id, { id: ev.fromId }, step.content);
          break;
        case "wa":
          await wa.sendMessage(token, channel.external_id, ev.fromId, step.content);
          break;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      console.error("[motor] falha ao enviar", step.kind, error);
    }
    await sql`
      insert into dispatches (automation_id, contact_id, inbound_event_id, kind, status, error)
      values (${a.id}, ${contact.id}, ${inbound.id}, ${step.kind}, ${error ? "failed" : "sent"}, ${error})
      on conflict do nothing`;
    if (error && step.kind !== "public_reply") break; // não manda o resto fora de ordem
  }

  if (a.tag_to_add) {
    await sql`
      update contacts set tags = array(select distinct unnest(tags || ${[a.tag_to_add]}::text[]))
      where id = ${contact.id}`;
  }
  return "handled";
}
