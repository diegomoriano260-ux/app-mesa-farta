import postgres from "postgres";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __sql: postgres.Sql | undefined;
}

// Uma conexão por instância. prepare:false funciona com o pooler do Supabase (porta 6543).
export function db(): postgres.Sql {
  if (!globalThis.__sql) {
    const url = env("DATABASE_URL");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    globalThis.__sql = postgres(url, {
      prepare: false,
      ssl: local ? false : "require", // Supabase/Neon: conexão criptografada
      connect_timeout: 10,
      max: 5,
      idle_timeout: 20,
      onnotice: () => {},
    });
  }
  return globalThis.__sql;
}
