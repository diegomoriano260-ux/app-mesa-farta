import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { listMedia, type IgMedia } from "@/lib/meta/instagram";
import type { MessageContent, Trigger } from "@/lib/meta/types";

export type ChannelOpt = { id: string; kind: "instagram" | "whatsapp"; display_name: string | null };
export type AutomationInput = {
  id?: string;
  name: string;
  channel_id: string;
  trigger: Trigger;
  post_id: string | null;
  keywords: string[];
  match_mode: "contains" | "exact";
  public_reply: string | null;
  tag_to_add: string | null;
  priority: number;
  is_active: boolean;
  messages: MessageContent[];
};

export async function loadChannels(): Promise<ChannelOpt[]> {
  return db()<ChannelOpt[]>`select id, kind, display_name from channels where status <> 'disconnected' order by kind, created_at`;
}

// Posts do Instagram para escolher no editor. Se a Meta falhar, o editor deixa digitar o ID.
export async function loadPosts(channels: ChannelOpt[]): Promise<Record<string, IgMedia[]>> {
  const out: Record<string, IgMedia[]> = {};
  const rows = await db()<{ id: string; access_token_enc: string }[]>`
    select id, access_token_enc from channels where kind = 'instagram' and status = 'connected'`;
  await Promise.all(
    rows.filter((r) => channels.some((c) => c.id === r.id)).map(async (r) => {
      try {
        out[r.id] = await listMedia(decrypt(r.access_token_enc));
      } catch (e) {
        console.error("[posts]", e);
        out[r.id] = [];
      }
    }),
  );
  return out;
}

export async function loadAutomation(id: string): Promise<AutomationInput | null> {
  const sql = db();
  const [a] = await sql<Omit<AutomationInput, "messages">[]>`
    select id, name, channel_id, trigger, post_id, keywords, match_mode, public_reply, tag_to_add, priority, is_active
    from automations where id = ${id}`;
  if (!a) return null;
  const msgs = await sql<{ kind: MessageContent["kind"]; content: Record<string, unknown> }[]>`
    select kind, content from automation_messages where automation_id = ${id} order by position`;
  return { ...a, messages: msgs.map((m) => ({ ...m.content, kind: m.kind }) as MessageContent) };
}
