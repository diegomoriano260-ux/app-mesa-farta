import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccount, listMedia, sendMessage, subscribeWebhooks } from "./instagram";

const calls: string[] = [];
vi.stubGlobal("fetch", async (url: string) => {
  calls.push(url);
  return new Response(JSON.stringify({ id: "17841", username: "aline", data: [] }), { status: 200 });
});
afterEach(() => { calls.length = 0; });

describe("rotas por tipo de token", () => {
  it("token IG usa graph.instagram.com e /me", async () => {
    await sendMessage("IGAAx", "17841", { id: "U1" }, { kind: "text", text: "oi" });
    await listMedia("IGAAx", "17841");
    expect(calls[0]).toMatch(/^https:\/\/graph\.instagram\.com\/v\d+\.0\/me\/messages$/);
    expect(calls[1]).toMatch(/graph\.instagram\.com\/v\d+\.0\/me\/media/);
  });
  it("token EAA usa graph.facebook.com e o id da conta", async () => {
    await sendMessage("EAAx", "17841", { comment_id: "C1" }, { kind: "text", text: "oi" });
    await subscribeWebhooks("EAAx", "17841");
    const acc = await getAccount("EAAx", "17841");
    expect(calls[0]).toMatch(/^https:\/\/graph\.facebook\.com\/v\d+\.0\/17841\/messages$/);
    expect(calls[1]).toMatch(/graph\.facebook\.com\/v\d+\.0\/17841\/subscribed_apps/);
    expect(calls[2]).toMatch(/graph\.facebook\.com\/v\d+\.0\/17841\?fields=id,username,name/);
    expect(acc).toMatchObject({ user_id: "17841", username: "aline" });
  });
});
