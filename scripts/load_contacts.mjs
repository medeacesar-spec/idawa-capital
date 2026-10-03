// Reprise des contacts des dossiers du pipeline (sources SharePoint), en UNE transaction.
// Une personne déjà présente sur la fiche (même nom) n'est pas recréée : seules ses
// coordonnées vides sont complétées. Rien de déjà saisi n'est écrasé.
//
//   node scripts/load_contacts.mjs <contacts.json> [--dry-run]
//
// <contacts.json> : [{ deal_id, organization, contacts: [{ name, function, phone, whatsapp,
//                      email, website, linkedin, instagram, notes }] }]
// Identifiants lus depuis .env.local (jamais affichés).
import pg from "pg";
import fs from "fs";

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage : node scripts/load_contacts.mjs <contacts.json> [--dry-run]"); process.exit(1); }
const dry = flag === "--dry-run";
const rows = JSON.parse(fs.readFileSync(file, "utf8"));
if (/\b(IFU|RCCM)\b/i.test(JSON.stringify(rows))) { console.error("❌ Mention IFU/RCCM : arrêt."); process.exit(1); }

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);
const ref = env.NEXT_PUBLIC_SUPABASE_URL.replace("https://", "").split(".")[0];
const c = new pg.Client({
  host: "aws-0-eu-west-1.pooler.supabase.com", port: 6543, user: `postgres.${ref}`,
  password: env.SUPABASE_DB_PASSWORD, database: "postgres", ssl: { rejectUnauthorized: false },
});
await c.connect();

const FIELDS = ["function", "phone", "whatsapp", "email", "website", "linkedin", "instagram", "notes"];
const n = { deals: 0, created: 0, completed: 0, unchanged: 0 };

try {
  await c.query("begin");
  for (const r of rows) {
    const d = await c.query("select id, company_name from deals where id = $1", [r.deal_id]);
    if (!d.rowCount) throw new Error(`dossier introuvable : ${r.deal_id} (${r.organization})`);
    n.deals++;
    for (const p of r.contacts ?? []) {
      if (!p.name?.trim()) throw new Error(`contact sans nom (${r.organization})`);
      const ex = await c.query("select id from contacts where deal_id = $1 and lower(name) = lower($2)", [r.deal_id, p.name.trim()]);
      if (ex.rowCount) {
        const sets = FIELDS.map((f, i) => `${f} = coalesce(${f}, $${i + 2})`).join(", ");
        const u = await c.query(
          `update contacts set ${sets} where id = $1 and (${FIELDS.map((f, i) => `(${f} is null and $${i + 2}::text is not null)`).join(" or ")})`,
          [ex.rows[0].id, ...FIELDS.map((f) => p[f] ?? null)]);
        n[u.rowCount ? "completed" : "unchanged"]++;
      } else {
        await c.query(
          `insert into contacts (name, organization, org_type, deal_id, ${FIELDS.join(", ")})
           values ($1, $2, 'Pipeline', $3, ${FIELDS.map((_, i) => `$${i + 4}`).join(", ")})`,
          [p.name.trim(), r.organization ?? d.rows[0].company_name, r.deal_id, ...FIELDS.map((f) => p[f] ?? null)]);
        n.created++;
      }
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
