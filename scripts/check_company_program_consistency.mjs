// Contrôle : le profil d'une entreprise doit s'accorder avec son programme principal.
//
// RÈGLE (posée par Médéa) : une entreprise suivie en CAPITAL relève forcément d'un
// programme qui investit — « Equity » ou un programme mixte. La placer dans un programme
// d'accélération la ferait afficher comme une simple accompagnée alors que le fonds
// détient des parts chez elle.
//
// L'incohérence ne vient pas d'une saisie fautive : il suffit qu'on change la NATURE d'un
// programme dans les paramètres pour que toutes ses entreprises basculent d'affichage,
// sans que personne n'ait touché à leurs données. C'est ce qui est arrivé à Tech & Digital.
//
//   node scripts/check_company_program_consistency.mjs           → liste seulement
//   node scripts/check_company_program_consistency.mjs --apply   → rattache au programme Equity

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const apply = process.argv.includes("--apply");

const [{ data: programs }, { data: companies }] = await Promise.all([
  db.from("programs").select("id, name, nature, status"),
  db.from("portfolio_companies").select("id, name, tracking_type, program_id, invested_amount"),
]);

const byId = new Map((programs ?? []).map((p) => [p.id, p]));
// Le réceptacle par défaut des participations directes.
const equityProgram = (programs ?? []).find((p) => p.nature === "invest" && p.status !== "Clos")
  ?? (programs ?? []).find((p) => p.name === "Equity");

const invests = (nature) => nature === "invest" || nature === "mixte";

const bad = (companies ?? []).filter((c) => {
  if ((c.tracking_type ?? "equity") !== "equity") return false;
  const p = byId.get(c.program_id);
  return !p || !invests(p.nature);
});

if (bad.length === 0) {
  console.log("✅ Chaque entreprise en capital relève bien d'un programme qui investit.");
  process.exit(0);
}

console.log(`${bad.length} incohérence(s) :\n`);
for (const c of bad) {
  const p = byId.get(c.program_id);
  const montant = Math.round(Number(c.invested_amount ?? 0) / 1e6);
  console.log(`  ${c.name} — ${montant} M investis, mais rattachée à « ${p?.name ?? "aucun programme"} » (${p?.nature ?? "—"})`);
}

if (!apply) {
  console.log(`\nLecture seule. Relancez avec --apply pour les rattacher à « ${equityProgram?.name ?? "Equity"} ».`);
  process.exit(1);
}
if (!equityProgram) {
  console.log("\n❌ Aucun programme d'investissement disponible pour les accueillir.");
  process.exit(1);
}

for (const c of bad) {
  await db.from("portfolio_companies").update({ program_id: equityProgram.id }).eq("id", c.id);
  // L'adhésion suit le programme principal, sinon la société disparaîtrait des filtres.
  const { data: existing } = await db.from("program_memberships")
    .select("id").eq("entity_type", "company").eq("entity_id", c.id).eq("program_id", equityProgram.id).is("date_end", null);
  if (!existing?.length) {
    await db.from("program_memberships").insert({
      entity_type: "company", entity_id: c.id, program_id: equityProgram.id,
      date_start: new Date().toISOString().slice(0, 10), note: "Mise en cohérence : entreprise en capital",
    });
  }
}
console.log(`\n${bad.length} entreprise(s) rattachée(s) à « ${equityProgram.name} ».`);
