// Jeu de données de TEST — instruments de financement pour 3 sociétés.
// Idempotent : supprime puis recrée tout ce qui porte notes = 'Donnée de test'.
//
// Usage :  node scripts/seed_test_instruments.mjs
// Les identifiants sont lus depuis .env.local (jamais en dur, jamais affichés).

import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const MARK = "Donnée de test";
const M = 1_000_000;

const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const api = async (path, init = {}) => {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
};

// --- Jeu de test : 3 sociétés, variations volontaires de type / taux / différé / durée / périodicité
const PLAN = [
  {
    company: "PayNow",
    instruments: [
      { type: "equity", label: "Prise de participation 2024", amount_committed: 250 * M, amount_disbursed: 250 * M, grant_date: "2024-03-01", ownership_pct: 25, valuation: 390 * M, valuation_method: "Multiple (comparables)" },
      { type: "quasi-equity", label: "Prêt d'actionnaire 2024", amount_committed: 100 * M, amount_disbursed: 100 * M, grant_date: "2024-03-01", interest_rate: 8, variable_rate: 2, rate_cap: 15, grace_months: 12, duration_months: 60, periodicity: "trimestrielle", first_due_date: "2024-06-30" },
    ],
  },
  {
    company: "AgriPlus",
    instruments: [
      { type: "equity", label: "Prise de participation 2023", amount_committed: 180 * M, amount_disbursed: 180 * M, grant_date: "2023-07-01", ownership_pct: 30, valuation: 245 * M, valuation_method: "Dernier tour" },
      { type: "quasi-equity", label: "Prêt d'actionnaire 2024", amount_committed: 60 * M, amount_disbursed: 60 * M, grant_date: "2023-12-01", interest_rate: 9, grace_months: 6, duration_months: 48, periodicity: "semestrielle", first_due_date: "2024-01-31" },
      { type: "pret-campagne", label: "Prêt de campagne 2026", amount_committed: 40 * M, amount_disbursed: 40 * M, grant_date: "2025-12-15", interest_rate: 10, grace_months: 0, duration_months: 12, periodicity: "trimestrielle", first_due_date: "2026-01-31" },
    ],
  },
  {
    company: "SolarLite",
    instruments: [
      { type: "equity", label: "Prise de participation 2024", amount_committed: 220 * M, amount_disbursed: 220 * M, grant_date: "2024-01-15", ownership_pct: 22, valuation: 290 * M, valuation_method: "DCF" },
      { type: "pret-campagne", label: "Prêt de campagne 2026", amount_committed: 75 * M, amount_disbursed: 50 * M, grant_date: "2025-12-01", interest_rate: 7.5, variable_rate: 1.5, rate_cap: 12, grace_months: 3, duration_months: 24, periodicity: "trimestrielle", first_due_date: "2026-03-31" },
    ],
  },
];

const companies = await api("portfolio_companies?select=id,name");
const byName = new Map(companies.map((c) => [c.name, c.id]));

const removed = await api(`financing_instruments?notes=eq.${encodeURIComponent(MARK)}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
console.log(`Nettoyage : ${removed?.length ?? 0} instrument(s) de test supprimé(s).`);

const raw = [];
for (const { company, instruments } of PLAN) {
  const id = byName.get(company);
  if (!id) { console.log(`⚠️  Société introuvable, ignorée : ${company}`); continue; }
  for (const i of instruments) raw.push({ ...i, company_id: id, currency: "XOF", notes: MARK });
}
// PostgREST exige des clés identiques sur tous les objets d'un insert groupé.
const allKeys = [...new Set(raw.flatMap((o) => Object.keys(o)))];
const payload = raw.map((o) => Object.fromEntries(allKeys.map((k) => [k, o[k] ?? null])));
const created = await api("financing_instruments", { method: "POST", body: JSON.stringify(payload), headers: { Prefer: "return=representation" } });
console.log(`Créés : ${created.length} instrument(s) sur ${new Set(payload.map((p) => p.company_id)).size} société(s).`);
for (const { company, instruments } of PLAN) {
  if (byName.get(company)) console.log(`  · ${company} → ${instruments.map((i) => i.type).join(", ")}`);
}
