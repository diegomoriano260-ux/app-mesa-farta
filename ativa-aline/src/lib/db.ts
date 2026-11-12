import postgres from "postgres";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __sql: postgres.Sql | undefined;
}

// Uma conexão por instância. prepare:false funciona com o pooler do Supabase (porta 6543).
export function db(): postgres.Sql {
  if (!globalThis.__sql) {
    globalThis.__sql = postgres(env("DATABASE_URL"), {
      prepare: false,
      max: 5,
      idle_timeout: 20,
      onnotice: () => {},
    });
  }
  return globalThis.__sql;
}
