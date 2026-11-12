export class GraphError extends Error {
  constructor(public status: number, public body: string) {
    super(`Meta API ${status}: ${body.slice(0, 300)}`);
  }
}

export async function graphFetch<T = unknown>(url: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(rest.body && typeof rest.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text();
  if (!res.ok) throw new GraphError(res.status, text);
  return (text ? JSON.parse(text) : {}) as T;
}
