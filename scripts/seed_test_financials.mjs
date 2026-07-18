// Jeu de données de TEST — Budget & BP (grille OHADA) pour 3 sociétés, sur 3 années.
// Idempotent : supprime puis recrée uniquement les couples (poste, année) qu'il génère.
//
// Usage :  node scripts/seed_test_financials.mjs

import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const M = 1_000_000;

const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const api = async (path, init = {}) => {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
};

// Profils volontairement différents : croissance, marge, écart au budget.
const PLAN = [
  { company: "PayNow", baseCA: 800, growth: 0.38, ebeRate: 0.21, real: [0.93, 1.07, null] },   // fintech : rate 2024, dépasse 2025
  { company: "AgriPlus", baseCA: 1250, growth: 0.12, ebeRate: 0.13, real: [1.02, 0.88, null] }, // agro : bon 2024, difficile 2025
  { company: "SolarLite", baseCA: 640, growth: 0.25, ebeRate: 0.18, real: [0.97, 0.99, null] }, // solaire : conforme
];
const YEARS = ["2024", "2025", "2026"]; // 2026 = budget seul (business plan)

function plFor(ca) {
  const achats = ca * 0.38;
  const va = ca * 0.52;
  const perso = ca * 0.26;
  const ebe = va - perso;
  const dot = ca * 0.05;
  const re = ebe - dot;
  const rf = -ca * 0.02;
  const rai = re + rf;
  const imp = Math.max(0, rai * 0.27);
  return {
    "Chiffre d'affaires": ca,
    "Achats consommés": achats,
    "Marge brute": ca - achats,
    "Valeur ajoutée": va,
    "Charges de personnel": perso,
    "Excédent brut d'exploitation (EBE)": ebe,
    "Dotations aux amortissements": dot,
    "Résultat d'exploitation": re,
    "Résultat financier": rf,
    "Résultat avant impôt": rai,
    "Impôt sur le résultat": imp,
    "Résultat net": rai - imp,
  };
}

const companies = await api("portfolio_companies?select=id,name");
const byName = new Map(companies.map((c) => [c.name, c.id]));

const payload = [];
for (const { company, baseCA, growth, real } of PLAN) {
  const id = byName.get(company);
  if (!id) { console.log(`⚠️  Société introuvable, ignorée : ${company}`); continue; }
  YEARS.forEach((year, yi) => {
    const ca = baseCA * Math.pow(1 + growth, yi);
    const budget = plFor(ca);
    const factor = real[yi];
    const actual = factor == null ? null : plFor(ca * factor);
    for (const [label, b] of Object.entries(budget)) {
      payload.push({
        company_id: id, period: year, label,
        budget: Math.round(b * M),
        actual: actual ? Math.round(actual[label] * M) : null,
      });
    }
  });
}

// Nettoyage ciblé : uniquement les couples générés, pour ne pas toucher d'autres saisies.
let removed = 0;
for (const id of new Set(payload.map((p) => p.company_id))) {
  const del = await api(
    `company_financials?company_id=eq.${id}&period=in.(${YEARS.join(",")})`,
    { method: "DELETE", headers: { Prefer: "return=representation" } }
  );
  removed += del?.length ?? 0;
}
console.log(`Nettoyage : ${removed} ligne(s) budgétaire(s) supprimée(s) sur ${YEARS.join(", ")}.`);

const created = await api("company_financials", { method: "POST", body: JSON.stringify(payload), headers: { Prefer: "return=representation" } });
console.log(`Créées : ${created.length} lignes (${PLAN.length} sociétés × ${YEARS.length} années × 12 postes OHADA).`);
console.log(`2026 = budget seul (business plan, réalisé vide).`);
