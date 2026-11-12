// Aplica db/*.sql em ordem. Uso: DATABASE_URL=... npm run db:migrate
import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Defina DATABASE_URL"); process.exit(1); }
const sql = postgres(url, { prepare: false, onnotice: () => {} });
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "db");
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  await sql.unsafe(readFileSync(join(dir, f), "utf8"));
  console.log("aplicado:", f);
}
await sql.end();
