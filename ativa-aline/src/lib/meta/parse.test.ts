import { describe, expect, it } from "vitest";
import { parseWebhook } from "./parse";

describe("parseWebhook instagram", () => {
  it("lê comentário", () => {
    const evs = parseWebhook({
      object: "instagram",
      entry: [{ id: "IG1", time: 1, changes: [{ field: "comments", value: {
        from: { id: "U1", username: "maria" }, media: { id: "M1", media_product_type: "FEED" }, id: "C1", text: "QUERO",
      } }] }],
    });
    expect(evs).toMatchObject([{ kind: "ig_comment", accountId: "IG1", eventId: "C1", fromId: "U1", postId: "M1", text: "QUERO", fromSelf: false }]);
  });
  it("marca comentário da própria conta", () => {
    const [ev] = parseWebhook({ object: "instagram", entry: [{ id: "IG1", changes: [{ field: "comments", value: { from: { id: "IG1" }, id: "C2", text: "x" } }] }] });
    expect(ev.fromSelf).toBe(true);
  });
  it("lê DM e marca eco", () => {
    const evs = parseWebhook({ object: "instagram", entry: [{ id: "IG1", messaging: [
      { sender: { id: "U1" }, recipient: { id: "IG1" }, timestamp: 1, message: { mid: "m1", text: "oi" } },
      { sender: { id: "IG1" }, recipient: { id: "U1" }, timestamp: 2, message: { mid: "m2", text: "resposta", is_echo: true } },
      { sender: { id: "U1" }, recipient: { id: "IG1" }, timestamp: 3, read: { mid: "m2" } },
    ] }] });
    expect(evs.map((e) => [e.eventId, e.fromSelf])).toEqual([["m1", false], ["m2", true]]);
  });
});

describe("parseWebhook whatsapp", () => {
  it("lê texto e ignora status", () => {
    const evs = parseWebhook({ object: "whatsapp_business_account", entry: [{ id: "WABA", changes: [
      { field: "messages", value: {
        messaging_product: "whatsapp", metadata: { phone_number_id: "P1" },
        contacts: [{ wa_id: "5511999", profile: { name: "Ana" } }],
        messages: [{ from: "5511999", id: "wamid.1", timestamp: "1", type: "text", text: { body: "Quero" } }],
      } },
      { field: "messages", value: { metadata: { phone_number_id: "P1" }, statuses: [{ id: "wamid.0", status: "read" }] } },
    ] }] });
    expect(evs).toMatchObject([{ kind: "wa_message", accountId: "P1", fromId: "5511999", fromName: "Ana", text: "Quero" }]);
  });
});
