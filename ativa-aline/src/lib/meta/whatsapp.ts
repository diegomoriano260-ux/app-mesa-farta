import { FB_GRAPH, GRAPH_VERSION } from "../env";
import { graphFetch } from "./graph";
import type { MessageContent } from "./types";

const base = () => `${FB_GRAPH()}/${GRAPH_VERSION()}`;

export function getPhoneNumber(token: string, phoneNumberId: string) {
  return graphFetch<{ id: string; display_phone_number: string; verified_name: string }>(
    `${base()}/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name`,
    { token },
  );
}

export function subscribeWaba(token: string, wabaId: string) {
  return graphFetch(`${base()}/${encodeURIComponent(wabaId)}/subscribed_apps`, { method: "POST", token });
}

// WhatsApp aceita só 1 botão de link (cta_url). Com mais, os links vão no texto.
export function toWaMessage(to: string, c: MessageContent): Record<string, unknown> {
  const common = { messaging_product: "whatsapp", recipient_type: "individual", to };
  switch (c.kind) {
    case "text":
      return { ...common, type: "text", text: { body: c.text, preview_url: true } };
    case "image":
      return { ...common, type: "image", image: { link: c.url } };
    case "buttons":
      if (c.buttons.length === 1) {
        return {
          ...common,
          type: "interactive",
          interactive: {
            type: "cta_url",
            body: { text: c.text },
            action: { name: "cta_url", parameters: { display_text: c.buttons[0].title.slice(0, 20), url: c.buttons[0].url } },
          },
        };
      }
      return {
        ...common,
        type: "text",
        text: { body: [c.text, "", ...c.buttons.map((b) => `${b.title}: ${b.url}`)].join("\n"), preview_url: true },
      };
  }
}

export function sendMessage(token: string, phoneNumberId: string, to: string, content: MessageContent) {
  return graphFetch(`${base()}/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    token,
    body: JSON.stringify(toWaMessage(to, content)),
  });
}
