// Enrichissement des champs de recherche des dossiers (secteur, stade, tags, effectifs),
// en UNE transaction. Ne remplit que ce qui est vide : rien de déjà saisi n'est écrasé.
//
//   node scripts/apply_search_enrichment.mjs <enrich.json> [--dry-run]
//
// <enrich.json> : [{ id, sub_sector_id, secondary_ids[], development_stage,
//                    tags: [{ family, name, source }], employees: [{ fiscal_year, employees, source }] }]
// Identifiants lus depuis .env.local (jamais affichés).
import pg from "pg";
import fs from "fs";

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage : node scripts/apply_search_enrichment.mjs <enrich.json> [--dry-run]"); process.exit(1); }
const dry = flag === "--dry-run";
const rows = JSON.parse(fs.readFileSync(file, "utf8"));
if (/\b(IFU|RCCM)\b/i.test(JSON.stringify(rows))) { console.error("❌ Mention IFU/RCCM : arrêt."); process.exit(1); }

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);
const ref = env.NEXT_PUBLIC_SUPABASE_URL.replace("https://", "").split(".")[0];
const c = new pg.Client({
  host: "aws-0-eu-west-1.pooler.supabase.com", port: 6543, user: `postgres.${ref}`,
  password: env.SUPABASE_DB_PASSWORD, database: "postgres", ssl: { rejectUnauthorized: false },
});
await c.connect();

const n = { sector: 0, sub_sectors: 0, stage: 0, tags_created: 0, tags_set: 0, employees: 0 };
const tagIds = new Map();
async function tagId(family, name) {
  const key = `${family ?? ""}|${name.toLowerCase()}`;
  if (tagIds.has(key)) return tagIds.get(key);
  let r = await c.query("select id from tags where coalesce(family,'') = coalesce($1,'') and lower(name) = lower($2)", [family, name]);
  if (!r.rowCount) { r = await c.query("insert into tags (family, name) values ($1, $2) returning id", [family, name]); n.tags_created++; }
  tagIds.set(key, r.rows[0].id);
  return r.rows[0].id;
}

try {
  await c.query("begin");
  for (const x of rows) {
    if (x.sub_sector_id) {
      const r = await c.query("update deals set primary_sub_sector_id = $2, updated_at = now() where id = $1 and primary_sub_sector_id is null", [x.id, x.sub_sector_id]);
      n.sector += r.rowCount;
    }
    for (const s of [x.sub_sector_id, ...(x.secondary_ids ?? [])].filter(Boolean)) {
      const r = await c.query("insert into deal_sub_sectors (deal_id, sub_sector_id) values ($1, $2) on conflict do nothing", [x.id, s]);
      n.sub_sectors += r.rowCount;
    }
    if (x.development_stage) {
      const r = await c.query("update deals set development_stage = $2 where id = $1 and development_stage is null", [x.id, x.development_stage]);
      n.stage += r.rowCount;
    }
    for (const t of x.tags ?? []) {
      const r = await c.query("insert into entity_tags (entity_type, entity_id, tag_id, source) values ('deal', $1, $2, 'auto') on conflict do nothing",
        [x.id, await tagId(t.family ?? null, t.name)]);
      n.tags_set += r.rowCount;
    }
    for (const e of x.employees ?? []) {
      const r = await c.query(
        `insert into key_figures (entity_type, entity_id, fiscal_year, employees, source)
         values ('deal', $1, $2, $3, $4)
         on conflict (entity_type, entity_id, fiscal_year) do update set employees = excluded.employees
         where key_figures.employees is null`,
        [x.id, e.fiscal_year, e.employees, e.source]);
      n.employees += r.rowCount;
    }
  }
  if (dry) { await c.query("rollback"); console.log("🧪 Essai à blanc (annulé) :", n); }
  else { await c.query("commit"); console.log("✅ Appliqué :", n); }
} catch (e) {
  await c.query("rollback");
  console.error("❌ Annulé, rien n'a été écrit :", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
