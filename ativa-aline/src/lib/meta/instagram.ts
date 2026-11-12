import { GRAPH_VERSION, IG_GRAPH, IG_OAUTH, env } from "../env";
import { graphFetch } from "./graph";
import type { MessageContent } from "./types";

const base = () => `${IG_GRAPH()}/${GRAPH_VERSION()}`;

export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
];

export function authorizeUrl(redirectUri: string, state: string): string {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("enable_fb_login", "0");
  u.searchParams.set("force_authentication", "1");
  u.searchParams.set("client_id", env("IG_APP_ID"));
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", IG_SCOPES.join(","));
  u.searchParams.set("state", state);
  return u.toString();
}

// code -> token curto -> token longo (~60 dias)
export async function exchangeCode(code: string, redirectUri: string) {
  const form = new URLSearchParams({
    client_id: env("IG_APP_ID"),
    client_secret: env("IG_APP_SECRET"),
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code: code.replace(/#_$/, ""),
  });
  const short = await graphFetch<{ access_token?: string; data?: { access_token: string }[] }>(
    `${IG_OAUTH()}/oauth/access_token`,
    { method: "POST", body: form },
  );
  const shortToken = short.access_token ?? short.data?.[0]?.access_token;
  if (!shortToken) throw new Error("Instagram não devolveu access_token");

  const u = new URL(`${IG_GRAPH()}/access_token`);
  u.searchParams.set("grant_type", "ig_exchange_token");
  u.searchParams.set("client_secret", env("IG_APP_SECRET"));
  u.searchParams.set("access_token", shortToken);
  const long = await graphFetch<{ access_token: string; expires_in: number }>(u.toString());
  return { token: long.access_token, expiresAt: new Date(Date.now() + long.expires_in * 1000) };
}

export async function refreshToken(token: string) {
  const u = new URL(`${IG_GRAPH()}/refresh_access_token`);
  u.searchParams.set("grant_type", "ig_refresh_token");
  u.searchParams.set("access_token", token);
  const r = await graphFetch<{ access_token: string; expires_in: number }>(u.toString());
  return { token: r.access_token, expiresAt: new Date(Date.now() + r.expires_in * 1000) };
}

// user_id é o mesmo id que chega como entry.id nos webhooks.
export function getMe(token: string) {
  return graphFetch<{ user_id: string; username: string; name?: string }>(
    `${base()}/me?fields=user_id,username,name`,
    { token },
  );
}

export function subscribeWebhooks(token: string) {
  return graphFetch(`${base()}/me/subscribed_apps?subscribed_fields=comments,messages`, { method: "POST", token });
}

export type IgMedia = { id: string; caption?: string; media_type: string; thumbnail_url?: string; media_url?: string; permalink?: string; timestamp: string };

export async function listMedia(token: string, limit = 24): Promise<IgMedia[]> {
  const r = await graphFetch<{ data: IgMedia[] }>(
    `${base()}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${limit}`,
    { token },
  );
  return r.data ?? [];
}

export function replyToComment(token: string, commentId: string, message: string) {
  return graphFetch(`${base()}/${encodeURIComponent(commentId)}/replies`, {
    method: "POST",
    token,
    body: JSON.stringify({ message }),
  });
}

export function toIgMessage(c: MessageContent): Record<string, unknown> {
  switch (c.kind) {
    case "text":
      return { text: c.text };
    case "image":
      return { attachment: { type: "image", payload: { url: c.url } } };
    case "buttons":
      return {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: c.text,
            buttons: c.buttons.slice(0, 3).map((b) => ({ type: "web_url", url: b.url, title: b.title })),
          },
        },
      };
  }
}

// recipient: { id: IGSID } para DM, { comment_id } para private reply (1 por comentário).
export function sendMessage(token: string, recipient: { id: string } | { comment_id: string }, content: MessageContent) {
  return graphFetch(`${base()}/me/messages`, {
    method: "POST",
    token,
    body: JSON.stringify({ recipient, message: toIgMessage(content) }),
  });
}
