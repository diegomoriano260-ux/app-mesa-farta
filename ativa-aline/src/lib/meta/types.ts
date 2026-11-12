export type Trigger = "ig_comment" | "ig_dm" | "wa_message";

// Um evento recebido da Meta, já no nosso formato.
export type InboundEvent = {
  kind: Trigger;
  channelKind: "instagram" | "whatsapp";
  accountId: string;      // IG user_id | WA phone_number_id
  eventId: string;        // comment id | mid | wamid
  fromId: string;         // IGSID | wa_id
  fromName?: string;
  fromUsername?: string;
  text: string;
  postId?: string;        // só comentários
  fromSelf: boolean;      // eco / comentário da própria conta: ignorar
  raw: unknown;
};

export type MessageContent =
  | { kind: "text"; text: string }
  | { kind: "image"; url: string }
  | { kind: "buttons"; text: string; buttons: { title: string; url: string }[] };
