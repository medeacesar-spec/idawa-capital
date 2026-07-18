// Applique un fichier de migration SQL sur la base Supabase.
// Usage :  node scripts/run_migration.mjs supabase/migrations/00XX_xxx.sql
// Identifiants lus depuis .env.local (jamais affichés).

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const file = process.argv[2];
if (!file) { console.error("Indiquez le fichier SQL. Ex : node scripts/run_migration.mjs supabase/migrations/0013_x.sql"); process.exit(1); }
const sql = fs.readFileSync(path.resolve(file), "utf8");
const ref = env.NEXT_PUBLIC_SUPABASE_URL.replace("https://", "").split(".")[0];

const client = new pg.Client({
  host: "aws-0-eu-west-1.pooler.supabase.com",
  port: 6543,
  user: `postgres.${ref}`,
  password: env.SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  console.log(`✅ Migration appliquée : ${path.basename(file)}`);
} catch (e) {
  console.error(`❌ Échec : ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
