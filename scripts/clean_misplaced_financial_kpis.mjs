// Nettoyage des KPIs financiers suivis dans la mauvaise famille.
//
// Règle de gestion : un indicateur financier vit UNIQUEMENT dans la famille « Financier ».
// La migration 0019 avait corrigé la BIBLIOTHÈQUE, mais pas les KPIs déjà suivis sur les
// sociétés et les dossiers, qui gardaient leur famille d'origine (souvent « Management »).
//
// SUPPRESSION DÉFINITIVE : le KPI et tout son historique de valeurs disparaissent. Le KPI
// est à re-suivre sous « Financier », où il pourra être alimenté automatiquement depuis les
// états financiers plutôt que ressaisi.
//
//   node scripts/clean_misplaced_financial_kpis.mjs           → liste seulement
//   node scripts/clean_misplaced_financial_kpis.mjs --apply   → supprime

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Un KPI est financier s'il correspond à un poste comptable ou à un ratio financier.
// Les huit indicateurs sectoriels rapatriés par la migration 0019 sont inclus.
const FINANCIAL = [
  /chiffre\s*d.?\s*affaires/i, /\bca\b/i, /marge/i, /valeur\s*ajout/i, /exc.dent\s*brut/i, /\bebe\b/i, /\bebitda\b/i,
  /r.sultat/i, /b.n.fice/i, /tr.sorerie/i, /\bbfr\b/i, /besoin\s*en\s*fonds/i, /fonds\s*de\s*roulement/i,
  /capitaux\s*propres/i, /\broe\b/i, /rentabilit/i, /autonomie\s*financi/i, /endettement/i, /liquidit/i,
  /produit\s*net\s*bancaire/i, /co.t\s*du\s*risque/i, /produits\s*d.?\s*int.r.ts/i, /co.t\s*mati/i,
  /co.t\s*de\s*production/i, /revenus\s*r.currents/i, /cash\s*flow/i, /\bcaf\b/i,
];
const isFinancial = (name) => FINANCIAL.some((r) => r.test(name));

const apply = process.argv.includes("--apply");

const [{ data: tracked }, { data: companies }, { data: deals }] = await Promise.all([
  db.from("tracked_kpis").select("id, name, category, entity_type, entity_id"),
  db.from("portfolio_companies").select("id, name"),
  db.from("deals").select("id, company_name"),
]);

const holderOf = (t) =>
  t.entity_type === "company"
    ? (companies ?? []).find((c) => c.id === t.entity_id)?.name
    : (deals ?? []).find((d) => d.id === t.entity_id)?.company_name;

const misplaced = (tracked ?? []).filter((t) => t.category !== "Financier" && isFinancial(t.name));

if (misplaced.length === 0) {
  console.log("Aucun KPI financier mal rangé. Rien à faire.");
  process.exit(0);
}

let values = 0;
for (const t of misplaced) {
  const { count } = await db.from("kpi_values").select("*", { count: "exact", head: true }).eq("tracked_kpi_id", t.id);
  t._values = count ?? 0;
  values += t._values;
  console.log(`  [${t.category}] ${t.name} — ${holderOf(t) ?? "?"} (${t._values} valeur(s))`);
}
console.log(`\n${misplaced.length} KPI(s) mal rangé(s), ${values} valeur(s) historique(s).`);

if (!apply) {
  console.log("\nLecture seule. Relancez avec --apply pour supprimer définitivement.");
  process.exit(0);
}

for (const t of misplaced) {
  await db.from("kpi_values").delete().eq("tracked_kpi_id", t.id);
  await db.from("tracked_kpis").delete().eq("id", t.id);
}
console.log(`\nSupprimés : ${misplaced.length} KPI(s) et ${values} valeur(s).`);
console.log("À re-suivre sous « Financier » — ils y seront alimentés depuis les états financiers.");
