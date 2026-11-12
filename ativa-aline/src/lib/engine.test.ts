import { describe, expect, it } from "vitest";
import { pickAutomation, planSteps, type AutomationRow } from "./engine";

const base: AutomationRow = {
  id: "a", trigger: "ig_comment", post_id: null, keywords: ["quero"], match_mode: "contains",
  public_reply: null, tag_to_add: null,
  messages: [{ kind: "text", text: "1" }, { kind: "text", text: "2" }],
};

describe("pickAutomation", () => {
  it("respeita post, gatilho e ordem", () => {
    const list = [
      { ...base, id: "post-certo", post_id: "M1" },
      { ...base, id: "qualquer-post" },
    ];
    expect(pickAutomation({ kind: "ig_comment", text: "quero", postId: "M1" }, list)?.id).toBe("post-certo");
    expect(pickAutomation({ kind: "ig_comment", text: "quero", postId: "M2" }, list)?.id).toBe("qualquer-post");
    expect(pickAutomation({ kind: "ig_dm", text: "quero" }, list)).toBeUndefined();
    expect(pickAutomation({ kind: "ig_comment", text: "nada", postId: "M1" }, list)).toBeUndefined();
  });
});

describe("planSteps", () => {
  it("comentário: resposta pública + só 1 private reply", () => {
    expect(planSteps({ kind: "ig_comment" }, { ...base, public_reply: "Te mandei na DM!" })).toEqual([
      { kind: "public_reply", text: "Te mandei na DM!" },
      { kind: "private_reply", content: { kind: "text", text: "1" } },
    ]);
  });
  it("DM e WhatsApp mandam todas", () => {
    expect(planSteps({ kind: "ig_dm" }, base).map((s) => s.kind)).toEqual(["dm", "dm"]);
    expect(planSteps({ kind: "wa_message" }, base).map((s) => s.kind)).toEqual(["wa", "wa"]);
  });
});
