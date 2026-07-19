// Jeu de démonstration pour l'ACCÉLÉRATION — toutes les entreprises accompagnées.
//
// Les écrans d'accélération montraient deux ou trois indicateurs par programme : trop peu
// pour juger de leur lisibilité, et rien ne remontait au niveau consolidé puisque les
// indicateurs de portée entreprise n'avaient aucune valeur saisie.
//
// Ce script est REJOUABLE : il repose sur des upserts, on peut le relancer sans doublon.
// Il ne touche qu'aux données d'accompagnement — ni participations, ni états financiers.
//
//   node scripts/seed_demo_support.mjs
//   node scripts/seed_demo_support.mjs --clean   → retire ce qu'il a créé

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const clean = process.argv.includes("--clean");

const PERIODS = ["2025-T3", "2025-T4", "2026-T1", "2026-T2"];

// Indicateurs suivis par nature de programme. Assez larges pour que les écrans
// consolidés aient de la matière, sans devenir une liste que personne ne remplirait.
const PROGRAMME_LEVEL = [
  { name: "Budget alloué", unit: "FCFA", category: "Moyens" },
  { name: "Montant décaissé", unit: "FCFA", category: "Moyens" },
  { name: "Taux d'exécution budgétaire", unit: "%", category: "Moyens" },
  { name: "Cofinancement mobilisé", unit: "FCFA", category: "Moyens" },
  { name: "% femmes bénéficiaires", unit: "%", category: "Bénéficiaires" },
  { name: "% jeunes (<35 ans)", unit: "%", category: "Bénéficiaires" },
  { name: "PME/entreprises accompagnées", unit: "nb", category: "Bénéficiaires" },
  { name: "Satisfaction des bénéficiaires", unit: "/10", category: "Activités" },
  { name: "Taux de présence aux formations", unit: "%", category: "Activités" },
  { name: "Recommandations mises en œuvre", unit: "%", category: "Réalisations" },
];
const COMPANY_LEVEL = [
  { name: "Jours d'assistance technique (AT)", unit: "jours", category: "Activités" },
  { name: "Missions d'accompagnement", unit: "nb", category: "Activités" },
  { name: "Sessions de formation", unit: "nb", category: "Activités" },
  { name: "Heures de mentorat individuel", unit: "heures", category: "Activités" },
  { name: "Diagnostics d'entreprise réalisés", unit: "nb", category: "Activités" },
  { name: "Plans d'affaires élaborés", unit: "nb", category: "Réalisations" },
  { name: "Outils de gestion mis en place", unit: "nb", category: "Réalisations" },
  { name: "États financiers produits", unit: "nb", category: "Réalisations" },
  { name: "Mises en relation financement/marché", unit: "nb", category: "Réalisations" },
  { name: "Emplois créés", unit: "nb", category: "Résultats" },
  { name: "Emplois féminins créés", unit: "nb", category: "Résultats" },
  { name: "Emplois soutenus/maintenus", unit: "nb", category: "Résultats" },
  { name: "Financements levés par les PME", unit: "FCFA", category: "Résultats" },
];

// Cibles et trajectoires par programme, pour que les écarts à la cible soient parlants.
const PROGRAM_PROFILE = {
  "Femmes Entrepreneures": { budget: 80e6, exec: [0.42, 0.55, 0.68, 0.79], femmes: 100, jeunes: 62, satisf: 8.4, presence: 88, reco: 71, pme: [18, 24, 29, 34], cofi: 22e6 },
  "Industrie & Énergie": { budget: 65e6, exec: [0.30, 0.46, 0.61, 0.72], femmes: 24, jeunes: 38, satisf: 7.6, presence: 74, reco: 58, pme: [9, 13, 16, 19], cofi: 15e6 },
  "Tech & Digital": { budget: 55e6, exec: [0.35, 0.52, 0.66, 0.80], femmes: 41, jeunes: 77, satisf: 8.8, presence: 91, reco: 66, pme: [11, 15, 18, 22], cofi: 18e6 },
  "Agri-PME": { budget: 48e6, exec: [0.28, 0.44, 0.59, 0.70], femmes: 47, jeunes: 45, satisf: 7.9, presence: 81, reco: 63, pme: [7, 10, 13, 15], cofi: 12e6 },
};

// Intensité d'accompagnement propre à chaque entreprise : sans écart entre elles, les
// totaux consolidés seraient plats et n'apprendraient rien.
const COMPANY_PROFILE = {
  "Nafi Couture": 1.3, "Karité d'Or": 1.0, SolarFarm: 1.5, MetalPro: 0.8,
  PionnierAgro: 0.7, TechStart: 1.2, PayNow: 1.4, AgriPlus: 0.6,
};

const round = (v, step = 1) => Math.max(0, Math.round(v / step) * step);

const [{ data: programs }, { data: companies }] = await Promise.all([
  db.from("programs").select("id, name, nature, status"),
  db.from("portfolio_companies").select("id, name, program_id, tracking_type, status"),
]);
const targets = (programs ?? []).filter(
  (p) => p.status !== "Clos" && (p.nature === "accompagnement" || p.nature === "mixte")
);

if (clean) {
  const ids = (await db.from("program_indicators").select("id").in("program_id", targets.map((p) => p.id))).data ?? [];
  const indIds = ids.map((i) => i.id);
  if (indIds.length) {
    await db.from("company_indicator_values").delete().in("program_indicator_id", indIds);
    await db.from("program_indicator_values").delete().in("program_indicator_id", indIds);
  }
  console.log(`Valeurs de démonstration retirées pour ${targets.length} programme(s).`);
  process.exit(0);
}

let created = 0, progVals = 0, compVals = 0;

for (const p of targets) {
  const profile = PROGRAM_PROFILE[p.name] ?? PROGRAM_PROFILE["Agri-PME"];
  const wanted = [
    ...PROGRAMME_LEVEL.map((i) => ({ ...i, scope: "programme" })),
    ...COMPANY_LEVEL.map((i) => ({ ...i, scope: "entreprise" })),
  ];

  const existing = (await db.from("program_indicators").select("id, name").eq("program_id", p.id)).data ?? [];
  const byName = new Map(existing.map((i) => [i.name, i.id]));

  for (const [pos, ind] of wanted.entries()) {
    if (!byName.has(ind.name)) {
      const { data } = await db.from("program_indicators")
        .insert({ program_id: p.id, category: ind.category, name: ind.name, unit: ind.unit, scope: ind.scope, position: pos })
        .select("id").single();
      if (data) { byName.set(ind.name, data.id); created++; }
    }
  }

  // Cibles : un objectif rend l'écart lisible sur les écrans consolidés.
  const setTarget = async (name, value) => {
    const id = byName.get(name);
    if (id) await db.from("program_indicators").update({ target: value }).eq("id", id);
  };
  await setTarget("Budget alloué", profile.budget);
  await setTarget("Montant décaissé", profile.budget);
  await setTarget("PME/entreprises accompagnées", Math.round(profile.pme[3] * 1.4));
  await setTarget("Taux d'exécution budgétaire", 100);
  await setTarget("% femmes bénéficiaires", p.name === "Femmes Entrepreneures" ? 100 : 40);
  await setTarget("Satisfaction des bénéficiaires", 9);
  await setTarget("Emplois créés", 120);
  await setTarget("Jours d'assistance technique (AT)", 200);

  // Valeurs au niveau du programme, trimestre par trimestre.
  const rows = [];
  PERIODS.forEach((period, q) => {
    const push = (name, value) => {
      const id = byName.get(name);
      if (id) rows.push({ program_indicator_id: id, period, value });
    };
    push("Budget alloué", profile.budget);
    push("Montant décaissé", round(profile.budget * profile.exec[q], 100000));
    push("Taux d'exécution budgétaire", Math.round(profile.exec[q] * 100));
    push("Cofinancement mobilisé", round(profile.cofi * (0.4 + 0.2 * q), 100000));
    push("% femmes bénéficiaires", profile.femmes);
    push("% jeunes (<35 ans)", profile.jeunes);
    push("PME/entreprises accompagnées", profile.pme[q]);
    push("Satisfaction des bénéficiaires", Math.round((profile.satisf + q * 0.1) * 10) / 10);
    push("Taux de présence aux formations", Math.min(100, profile.presence + q * 2));
    push("Recommandations mises en œuvre", Math.min(100, profile.reco + q * 4));
  });
  if (rows.length) {
    await db.from("program_indicator_values").upsert(rows, { onConflict: "program_indicator_id,period" });
    progVals += rows.length;
  }

  // Valeurs par entreprise : c'est ce qui alimente les totaux consolidés.
  const mine = (companies ?? []).filter(
    (c) => c.program_id === p.id && c.status !== "Sorti" && c.status !== "Radié"
  );
  const cRows = [];
  for (const c of mine) {
    const k = COMPANY_PROFILE[c.name] ?? 1;
    PERIODS.forEach((period, q) => {
      const ramp = 0.7 + 0.15 * q; // l'accompagnement monte en charge
      const push = (name, value) => {
        const id = byName.get(name);
        if (id) cRows.push({ company_id: c.id, program_indicator_id: id, period, value });
      };
      push("Jours d'assistance technique (AT)", round(9 * k * ramp));
      push("Missions d'accompagnement", round(2 * k * ramp));
      push("Sessions de formation", round(3 * k * ramp));
      push("Heures de mentorat individuel", round(12 * k * ramp));
      push("Diagnostics d'entreprise réalisés", q === 0 ? 1 : 0);
      push("Plans d'affaires élaborés", q === 1 ? 1 : 0);
      push("Outils de gestion mis en place", round(1 * k));
      push("États financiers produits", q >= 2 ? 1 : 0);
      push("Mises en relation financement/marché", round(1.5 * k * ramp));
      push("Emplois créés", round(4 * k * ramp));
      push("Emplois féminins créés", round(2.2 * k * ramp));
      push("Emplois soutenus/maintenus", round(7 * k * ramp));
      push("Financements levés par les PME", q >= 2 ? round(9e6 * k, 500000) : 0);
    });
  }
  if (cRows.length) {
    await db.from("company_indicator_values").upsert(cRows, { onConflict: "company_id,program_indicator_id,period" });
    compVals += cRows.length;
  }
  console.log(`${p.name.padEnd(24)} ${mine.length} entreprise(s), ${rows.length} valeurs programme, ${cRows.length} valeurs entreprise`);
}

console.log(`\n${created} indicateur(s) ajouté(s), ${progVals} valeurs programme, ${compVals} valeurs entreprise.`);
