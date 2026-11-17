// Aplica db/*.sql em ordem. Uso: DATABASE_URL=... npm run db:migrate
import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) { console.log("DATABASE_URL ausente: pulando migrações"); process.exit(0); }
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { prepare: false, onnotice: () => {}, ssl: local ? false : "require" });
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "db");
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  await sql.unsafe(readFileSync(join(dir, f), "utf8"));
  console.log("aplicado:", f);
}
await sql.end();
