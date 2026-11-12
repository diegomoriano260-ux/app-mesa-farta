import { describe, expect, it } from "vitest";
import { toIgMessage } from "./instagram";
import { toWaMessage } from "./whatsapp";
import { verifySignature } from "./signature";
import { createHmac } from "node:crypto";

describe("formatos de mensagem", () => {
  const btn = { kind: "buttons" as const, text: "Aqui", buttons: [{ title: "Abrir", url: "https://x.com" }] };
  it("Instagram: template de botões", () => {
    expect(toIgMessage(btn)).toMatchObject({ attachment: { type: "template", payload: { template_type: "button", buttons: [{ type: "web_url" }] } } });
  });
  it("WhatsApp: 1 botão vira cta_url, 2+ vira texto com links", () => {
    expect(toWaMessage("55", btn)).toMatchObject({ type: "interactive", interactive: { type: "cta_url" } });
    const two = { ...btn, buttons: [...btn.buttons, { title: "B", url: "https://y.com" }] };
    expect(toWaMessage("55", two)).toMatchObject({ type: "text" });
  });
});

describe("assinatura", () => {
  it("aceita só HMAC certo", () => {
    const body = '{"a":1}';
    const sig = "sha256=" + createHmac("sha256", "s2").update(body).digest("hex");
    expect(verifySignature(body, sig, ["s1", "s2"])).toBe(true);
    expect(verifySignature(body + " ", sig, ["s1", "s2"])).toBe(false);
    expect(verifySignature(body, null, ["s2"])).toBe(false);
    expect(verifySignature(body, sig, [undefined])).toBe(false);
  });
});
