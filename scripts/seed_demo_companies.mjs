// Jeu de démonstration COMPLET pour toutes les entreprises du portefeuille.
//
// Presque toutes les fiches s'ouvraient sur des onglets vides : impossible de juger la
// lisibilité d'un écran qui n'affiche rien, ni de repérer un défaut d'affichage.
//
// Chaque entreprise reçoit ce que son profil justifie : une participation a des
// instruments, une valorisation arrêtée et une table de capital ; une entreprise
// accélérée n'en a pas, puisque le fonds ne détient rien chez elle. Les deux ont des
// états financiers, un budget, des KPIs, un suivi, un volet ESG et des contacts.
//
// REJOUABLE : tout passe par des upserts ou des vérifications d'existence.
//
//   node scripts/seed_demo_companies.mjs
//   node scripts/seed_demo_companies.mjs --clean

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const clean = process.argv.includes("--clean");

const YEARS = [2024, 2025, 2026];
const M = 1_000_000;

// Profils sectoriels : marges et intensités différentes, sinon toutes les fiches
// se ressemblent et aucun écran comparatif n'a de sens.
const PROFILE = {
  PayNow: { ca: 210, marge: 0.22, croissance: 1.34, secteur: "Paiement mobile" },
  AgriPlus: { ca: 380, marge: 0.14, croissance: 1.18, secteur: "Transformation agroalimentaire" },
  SolarLite: { ca: 290, marge: 0.19, croissance: 1.41, secteur: "Solaire" },
  EduSmart: { ca: 95, marge: 0.11, croissance: 1.52, secteur: "EdTech" },
  MediCare: { ca: 160, marge: 0.09, croissance: 1.12, secteur: "Santé" },
  CliniqPlus: { ca: 240, marge: 0.16, croissance: 1.27, secteur: "Cliniques" },
  KweeziPay: { ca: 130, marge: 0.08, croissance: 1.63, secteur: "Fintech" },
  BatiPro: { ca: 175, marge: 0.12, croissance: 1.21, secteur: "BTP" },
  "Nafi Couture": { ca: 38, marge: 0.17, croissance: 1.29, secteur: "Textile" },
  "Karité d'Or": { ca: 52, marge: 0.21, croissance: 1.36, secteur: "Cosmétique" },
  SolarFarm: { ca: 64, marge: 0.15, croissance: 1.44, secteur: "Énergie" },
  MetalPro: { ca: 88, marge: 0.10, croissance: 1.15, secteur: "Métallurgie" },
  PionnierAgro: { ca: 29, marge: 0.13, croissance: 1.22, secteur: "Agriculture" },
  TechStart: { ca: 21, marge: -0.05, croissance: 1.78, secteur: "Logiciel" },
};
const DEFAULT = { ca: 100, marge: 0.12, croissance: 1.2, secteur: "Services" };

// Postes OHADA saisis (les totaux sont calculés par l'application).
function ohadaFor(caM, marge) {
  const ca = Math.round(caM * M);
  const achats = Math.round(ca * 0.46);
  const perso = Math.round(ca * 0.21);
  const services = Math.round(ca * 0.11);
  const dotations = Math.round(ca * 0.05);
  const resultat = Math.round(ca * marge);
  const capitaux = Math.round(ca * 0.55);
  return {
    TA: ca, RA: achats, RQ: 0,
    // Charges externes et personnel : ce qui construit la valeur ajoutée puis l'EBE.
    RD: services, RK: perso, RL: dotations,
    // Bilan : de quoi calculer fonds de roulement, BFR et trésorerie.
    AJ: Math.round(ca * 0.18), AK: Math.round(ca * 0.32), AR: Math.round(ca * 0.04),
    BI: Math.round(ca * 0.21), BB: Math.round(ca * 0.13), BS: Math.round(ca * 0.09),
    CA: capitaux, CD: Math.round(resultat * 0.6), DD: Math.round(ca * 0.16),
    DJ: Math.round(ca * 0.19), DT: Math.round(ca * 0.03),
  };
}

const BUDGET_LINES = (caM, marge) => {
  const ca = caM * M, achats = ca * 0.46, va = ca * 0.42, perso = ca * 0.21;
  const ebe = va - perso, dot = ca * 0.05, re = ebe - dot, rf = -ca * 0.015;
  const rai = re + rf, imp = Math.max(0, rai * 0.27);
  return {
    "Chiffre d'affaires": ca, "Achats consommés": achats, "Marge brute": ca - achats,
    "Valeur ajoutée": va, "Charges de personnel": perso, "Excédent brut d'exploitation (EBE)": ebe,
    "Dotations aux amortissements": dot, "Résultat d'exploitation": re, "Résultat financier": rf,
    "Résultat avant impôt": rai, "Impôt sur le résultat": imp, "Résultat net": ca * marge,
  };
};

const KPIS = [
  { category: "Financier", name: "Chiffre d'affaires", unit: "FCFA", direction: "high" },
  { category: "Financier", name: "Excédent brut d'exploitation", unit: "FCFA", direction: "high" },
  { category: "Financier", name: "Marge nette", unit: "%", direction: "high" },
  { category: "Financier", name: "Trésorerie nette", unit: "FCFA", direction: "high" },
  { category: "Commercial", name: "Nombre de clients actifs", unit: "nb", direction: "high" },
  { category: "Commercial", name: "Panier moyen", unit: "FCFA", direction: "high" },
  { category: "Production", name: "Taux de rebut", unit: "%", direction: "low" },
  { category: "Client", name: "Taux de satisfaction", unit: "%", direction: "high" },
  { category: "Management", name: "Effectif total", unit: "nb", direction: "high" },
  { category: "Support", name: "Disponibilité du système", unit: "%", direction: "high" },
];

const NOTES = [
  { type: "Réunion", summary: "Comité de suivi trimestriel : revue du chiffre d'affaires, point sur la trésorerie et calendrier de recrutement.", participants: "Direction, chargé d'investissement" },
  { type: "Appel", summary: "Point avec le dirigeant sur le retard de production et le plan de rattrapage proposé.", participants: "Dirigeant, analyste" },
  { type: "Visite", summary: "Visite du site : capacité de production conforme, stockage à réorganiser avant la haute saison.", participants: "Chargé d'investissement" },
];
const TASKS = [
  { title: "Obtenir les états financiers certifiés de l'exercice", status: "En cours", days: -12 },
  { title: "Programmer le comité de suivi du trimestre", status: "À faire", days: 9 },
  { title: "Valider le plan de trésorerie révisé", status: "À faire", days: -3 },
];
const ESG_ACTIONS = [
  { category: "E", action: "Mettre en place le tri et l'évacuation des déchets de production", status: "En cours", days: 45 },
  { category: "S", action: "Formaliser les contrats de travail et l'affiliation à la sécurité sociale", status: "À lancer", days: -20 },
  { category: "G", action: "Instaurer un conseil d'administration trimestriel avec compte rendu", status: "En cours", days: 60 },
];
const VALUE = [
  { lever: "Croissance & commercial", initiative: "Ouvrir deux points de vente régionaux", status: "En cours", days: 90, impact: "Croissance du chiffre d'affaires de 15 %" },
  { lever: "Excellence opérationnelle", initiative: "Digitaliser le suivi des stocks", status: "Planifiée", days: 150, impact: "Réduction des ruptures et du gaspillage" },
  { lever: "Gouvernance & management", initiative: "Recruter un directeur administratif et financier", status: "En cours", days: -15, impact: "Fiabilité du reporting mensuel" },
];
const DD = [
  { domain: "Financière", item: "Revue des comptes des trois derniers exercices", status: "Terminé" },
  { domain: "Juridique & fiscale", item: "Vérification des statuts et du registre du commerce", status: "Terminé" },
  { domain: "ESG", item: "Conformité de la gestion des déchets", status: "Point d'attention" },
];
const CONTACTS = [
  { function: "Dirigeant·e", org_type: "Entreprise" },
  { function: "Responsable financier", org_type: "Entreprise" },
];
const DOCS = [
  { title: "Pacte d'actionnaires", category: "Juridique" },
  { title: "États financiers de l'exercice", category: "Financier" },
  { title: "Rapport de suivi trimestriel", category: "Reporting" },
];

const iso = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const { data: companies } = await db.from("portfolio_companies")
  .select("id, name, tracking_type, invested_amount, status");

if (clean) {
  const ids = (companies ?? []).map((c) => c.id);
  for (const [t, col] of [["financial_statements", "company_id"], ["company_financials", "company_id"],
    ["company_captable", "company_id"], ["notes", "entity_id"], ["tasks", "entity_id"],
    ["esg_actions", "entity_id"], ["value_creation", "entity_id"], ["dd_items", "entity_id"]]) {
    await db.from(t).delete().in(col, ids);
  }
  console.log("Données de démonstration retirées.");
  process.exit(0);
}

let stats = { statements: 0, budget: 0, kpis: 0, values: 0, notes: 0, tasks: 0, esg: 0, value: 0, dd: 0, cap: 0, contacts: 0, docs: 0 };

for (const c of companies ?? []) {
  const p = PROFILE[c.name] ?? DEFAULT;
  const equity = (c.tracking_type ?? "equity") === "equity";

  // --- États financiers OHADA, un exercice par année ---
  const stmts = [];
  YEARS.forEach((year, i) => {
    const caM = p.ca / Math.pow(p.croissance, YEARS.length - 1 - i);
    for (const [code, amount] of Object.entries(ohadaFor(caM, p.marge))) {
      stmts.push({ company_id: c.id, fiscal_year: year, code, amount });
    }
  });
  await db.from("financial_statements").upsert(stmts, { onConflict: "company_id,fiscal_year,code" });
  stats.statements += stmts.length;

  // --- Budget & business plan ---
  const existingBudget = (await db.from("company_financials").select("id, period, label").eq("company_id", c.id)).data ?? [];
  const seen = new Set(existingBudget.map((r) => `${r.period}|${r.label}`));
  const budgetRows = [];
  YEARS.forEach((year, i) => {
    const caM = p.ca / Math.pow(p.croissance, YEARS.length - 1 - i);
    for (const [label, value] of Object.entries(BUDGET_LINES(caM, p.marge))) {
      if (seen.has(`${year}|${label}`)) continue;
      // Le réalisé s'écarte du budget, sinon la comparaison n'apprend rien.
      const realise = year === 2026 ? null : Math.round(value * (0.9 + (i * 0.06)));
      budgetRows.push({ company_id: c.id, period: String(year), label, budget: Math.round(value), actual: realise });
    }
  });
  if (budgetRows.length) { await db.from("company_financials").insert(budgetRows); stats.budget += budgetRows.length; }

  // --- KPIs suivis et leurs valeurs ---
  const existingKpis = (await db.from("tracked_kpis").select("id, name").eq("entity_type", "company").eq("entity_id", c.id)).data ?? [];
  const kpiByName = new Map(existingKpis.map((k) => [k.name, k.id]));
  for (const k of KPIS) {
    if (kpiByName.has(k.name)) continue;
    const { data } = await db.from("tracked_kpis")
      .insert({ entity_type: "company", entity_id: c.id, kind: "business", category: k.category, name: k.name, unit: k.unit, direction: k.direction })
      .select("id").single();
    if (data) { kpiByName.set(k.name, data.id); stats.kpis++; }
  }
  const kpiValues = [];
  YEARS.forEach((year, i) => {
    const caM = p.ca / Math.pow(p.croissance, YEARS.length - 1 - i);
    const val = {
      "Chiffre d'affaires": Math.round(caM * M),
      "Excédent brut d'exploitation": Math.round(caM * M * 0.21),
      "Marge nette": Math.round(p.marge * 1000) / 10,
      "Trésorerie nette": Math.round(caM * M * 0.06),
      "Nombre de clients actifs": Math.round(caM * 12),
      "Panier moyen": Math.round((caM * M) / Math.max(1, caM * 12)),
      "Taux de rebut": Math.round((6 - i) * 10) / 10,
      "Taux de satisfaction": 78 + i * 4,
      "Effectif total": Math.round(caM / 3),
      "Disponibilité du système": 96 + i,
    };
    for (const [name, value] of Object.entries(val)) {
      const id = kpiByName.get(name);
      if (id) kpiValues.push({ tracked_kpi_id: id, period: String(year), value });
    }
  });
  if (kpiValues.length) { await db.from("kpi_values").upsert(kpiValues, { onConflict: "tracked_kpi_id,period" }); stats.values += kpiValues.length; }

  // --- Suivi : notes et actions ---
  const nbNotes = (await db.from("notes").select("id", { count: "exact", head: true }).eq("entity_type", "company").eq("entity_id", c.id)).count ?? 0;
  if (nbNotes === 0) {
    await db.from("notes").insert(NOTES.map((n, i) => ({
      entity_type: "company", entity_id: c.id, type: n.type,
      note_date: iso(-30 * (i + 1)), participants: n.participants, summary: n.summary,
    })));
    stats.notes += NOTES.length;
  }
  const nbTasks = (await db.from("tasks").select("id", { count: "exact", head: true }).eq("entity_type", "company").eq("entity_id", c.id)).count ?? 0;
  if (nbTasks === 0) {
    await db.from("tasks").insert(TASKS.map((t) => ({
      entity_type: "company", entity_id: c.id, title: t.title, status: t.status,
      due_date: iso(t.days), source: "démonstration",
    })));
    stats.tasks += TASKS.length;
  }

  // --- ESG : diagnostic et plan d'action ---
  const nbDiag = (await db.from("esg_assessments").select("id", { count: "exact", head: true }).eq("entity_type", "company").eq("entity_id", c.id)).count ?? 0;
  if (nbDiag === 0) {
    await db.from("esg_assessments").insert({
      entity_type: "company", entity_id: c.id, exclusion_ok: true,
      risk_category: p.marge < 0.12 ? "B" : "C",
    });
  }
  const nbEsg = (await db.from("esg_actions").select("id", { count: "exact", head: true }).eq("entity_type", "company").eq("entity_id", c.id)).count ?? 0;
  if (nbEsg === 0) {
    await db.from("esg_actions").insert(ESG_ACTIONS.map((a) => ({
      entity_type: "company", entity_id: c.id, category: a.category, action: a.action,
      status: a.status, date_end_plan: iso(a.days), responsible_code: "RI",
    })));
    stats.esg += ESG_ACTIONS.length;
  }

  // --- Création de valeur ---
  const nbVc = (await db.from("value_creation").select("id", { count: "exact", head: true }).eq("entity_type", "company").eq("entity_id", c.id)).count ?? 0;
  if (nbVc === 0) {
    await db.from("value_creation").insert(VALUE.map((v) => ({
      entity_type: "company", entity_id: c.id, lever: v.lever, initiative: v.initiative,
      status: v.status, target_date: iso(v.days), impact: v.impact,
    })));
    stats.value += VALUE.length;
  }

  // --- Due diligence (héritée de l'instruction) ---
  const nbDd = (await db.from("dd_items").select("id", { count: "exact", head: true }).eq("entity_type", "company").eq("entity_id", c.id)).count ?? 0;
  if (nbDd === 0) {
    await db.from("dd_items").insert(DD.map((d) => ({
      entity_type: "company", entity_id: c.id, domain: d.domain, item: d.item, status: d.status,
    })));
    stats.dd += DD.length;
  }

  // --- Contacts ---
  const nbContacts = (await db.from("contacts").select("id", { count: "exact", head: true }).eq("company_id", c.id)).count ?? 0;
  if (nbContacts === 0) {
    await db.from("contacts").insert(CONTACTS.map((ct, i) => ({
      name: `${["Awa", "Kofi"][i]} ${c.name.split(" ")[0]}`, function: ct.function,
      organization: c.name, org_type: ct.org_type,
      email: `contact${i + 1}@${c.name.toLowerCase().replace(/[^a-z]/g, "")}.bj`,
      company_id: c.id,
    })));
    stats.contacts += CONTACTS.length;
  }

  // --- Documents (fiches sans fichier joint) ---
  const nbDocs = (await db.from("documents").select("id", { count: "exact", head: true }).eq("company_id", c.id)).count ?? 0;
  if (nbDocs === 0) {
    await db.from("documents").insert(DOCS.map((d) => ({ title: `${d.title} — ${c.name}`, category: d.category, company_id: c.id })));
    stats.docs += DOCS.length;
  }

  // --- Réservé aux participations : table de capital ---
  if (equity) {
    const nbCap = (await db.from("company_captable").select("id", { count: "exact", head: true }).eq("company_id", c.id)).count ?? 0;
    if (nbCap === 0) {
      await db.from("company_captable").insert([
        { company_id: c.id, holder: "Fondateurs", holder_type: "Fondateur", pct: 58 },
        { company_id: c.id, holder: "Idawa Capital", holder_type: "Idawa Capital", pct: 25 },
        { company_id: c.id, holder: "Co-investisseur régional", holder_type: "Co-investisseur", pct: 12 },
        { company_id: c.id, holder: "Pool salariés", holder_type: "ESOP / salariés", pct: 5 },
      ]);
      stats.cap += 4;
    }
  }

  console.log(`${c.name.padEnd(15)} ${equity ? "participation" : "accélération "} — états financiers, budget, KPIs, suivi, ESG, création de valeur, contacts, documents${equity ? ", cap table" : ""}`);
}

console.log(`\n${JSON.stringify(stats, null, 1)}`);
