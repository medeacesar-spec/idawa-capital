// Chargement d'un lot de la migration SharePoint → Idawa (dossiers, notes, comités, documents,
// chiffres clés, adhésions programme), en UNE transaction : tout passe ou rien ne passe.
//
//   node scripts/load_sharepoint_lot.mjs <lot.json> [--dry-run]
//
// <lot.json> : soit un tableau de dossiers à créer, soit { deals: [...], updates: [...] } où
// chaque « update » enrichit un dossier EXISTANT (même entreprise déjà chargée) : notes,
// chiffres clés (un exercice déjà renseigné n'est jamais écrasé), champs vides complétés.
//
// Refuse de recharger un dossier déjà présent (même nom + même import_source).
// Fonds : aucun par défaut (pipeline non qualifié) ; `"fund": true` rattache au fonds principal.
// Identifiants lus depuis .env.local (jamais affichés).
import pg from "pg";
import fs from "fs";

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage : node scripts/load_sharepoint_lot.mjs <lot.json> [--dry-run]"); process.exit(1); }
const dry = flag === "--dry-run";
const raw = JSON.parse(fs.readFileSync(file, "utf8"));
const lot = Array.isArray(raw) ? raw : raw.deals ?? [];
const updates = Array.isArray(raw) ? [] : raw.updates ?? [];

// Consigne de Médéa : ni IFU ni RCCM dans les dossiers migrés.
if (/\b(IFU|RCCM)\b/i.test(JSON.stringify(raw))) { console.error("❌ Mention IFU/RCCM dans le lot : arrêt."); process.exit(1); }

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

const fund = (await c.query("select id from funds order by created_at limit 1")).rows[0]?.id;
const programs = new Map((await c.query("select id, name from programs")).rows.map((r) => [r.name, r.id]));
const n = { deals: 0, enriched: 0, notes: 0, committees: 0, documents: 0, key_figures: 0, key_figures_kept: 0, memberships: 0 };

async function addKeyFigures(dealId, list) {
  for (const x of list ?? []) {
    const r = await c.query(
      `insert into key_figures (entity_type, entity_id, fiscal_year, revenue, ebitda, net_income, employees, source, note)
       values ('deal',$1,$2,$3,$4,$5,$6,$7,$8) on conflict (entity_type, entity_id, fiscal_year) do nothing`,
      [dealId, x.fiscal_year, x.revenue, x.ebitda, x.net_income, x.employees, x.source, x.note]);
    r.rowCount ? n.key_figures++ : n.key_figures_kept++;
  }
}

try {
  await c.query("begin");
  for (const d of lot) {
    const exists = await c.query("select 1 from deals where company_name = $1 and import_source = $2", [d.company_name, d.import_source]);
    if (exists.rowCount) throw new Error(`Déjà chargé : ${d.company_name}`);
    const programId = d.program ? programs.get(d.program) : null;
    if (d.program && !programId) throw new Error(`Programme introuvable : ${d.program}`);
    const { rows: [deal] } = await c.query(
      `insert into deals (fund_id, company_name, stage, deal_state, standby_reason, rejection_reason, amount, probability,
         deal_source, deal_source_detail, country, city, founded_year, description, promoter_name, import_source, program_id,
         promoter_gender, sharepoint_folder_id)
       values ($1,$2,$3,$4,$5,$6,$7,null,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) returning id`,
      [d.fund ? fund : null, d.company_name, d.stage, d.deal_state, d.standby_reason, d.rejection_reason, d.amount,
       d.deal_source, d.deal_source_detail, d.country, d.city, d.founded_year, d.description, d.promoter_name,
       d.import_source, programId, d.promoter_gender ?? null, d.sharepoint_folder_id ?? null],
    );
    n.deals++;
    if (programId) {
      await c.query("insert into program_memberships (entity_type, entity_id, program_id, date_start, note) values ('deal',$1,$2,$3,$4)",
        [deal.id, programId, d.program_start ?? null, "Reprise SharePoint"]);
      n.memberships++;
    }
    for (const x of d.notes) {
      await c.query("insert into notes (entity_type, entity_id, type, note_date, summary) values ('deal',$1,$2,$3,$4)",
        [deal.id, x.type, x.note_date, x.summary]);
      n.notes++;
    }
    for (const x of d.committees) {
      await c.query(
        `insert into committee_passages (deal_id, committee_type, session_date, decision, conditions, status, validated_at)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [deal.id, x.committee_type, x.session_date, x.decision, x.conditions, x.status, x.validated_at]);
      n.committees++;
    }
    for (const x of d.documents) {
      if (!/^https:\/\//.test(x.url)) throw new Error(`Lien invalide (${d.company_name}) : ${x.url}`);
      await c.query("insert into documents (title, category, url, deal_id, notes) values ($1,$2,$3,$4,$5)",
        [x.title, x.category, x.url, deal.id, x.notes ?? null]);
      n.documents++;
    }
    await addKeyFigures(deal.id, d.key_figures);
  }
  for (const u of updates) {
    const f = u.fill ?? {};
    const r = await c.query(
      `update deals set city = coalesce(city, $2), promoter_name = coalesce(promoter_name, $3), promoter_gender = coalesce(promoter_gender, $4),
         founded_year = coalesce(founded_year, $5), sharepoint_folder_id = coalesce(sharepoint_folder_id, $6), updated_at = now()
       where id = $1 and company_name = $7`,
      [u.existing_id, f.city ?? null, f.promoter_name ?? null, f.promoter_gender ?? null, f.founded_year ?? null, f.sharepoint_folder_id ?? null, u.company_name]);
    if (!r.rowCount) throw new Error(`Dossier existant introuvable : ${u.company_name}`);
    n.enriched++;
    for (const x of u.notes ?? []) {
      await c.query("insert into notes (entity_type, entity_id, type, note_date, summary) values ('deal',$1,$2,$3,$4)", [u.existing_id, x.type, x.note_date, x.summary]);
      n.notes++;
    }
    await addKeyFigures(u.existing_id, u.key_figures);
  }
  if (dry) { await c.query("rollback"); console.log("🧪 Essai à blanc (annulé) :", n); }
  else { await c.query("commit"); console.log("✅ Lot chargé :", n); }
} catch (e) {
  await c.query("rollback");
  console.error("❌ Annulé, rien n'a été écrit :", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
