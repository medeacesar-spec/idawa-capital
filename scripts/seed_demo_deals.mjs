// Jeu de démonstration pour les DOSSIERS du pipeline.
//
// Le pendant de seed_demo_companies.mjs, qui n'avait traité que le portefeuille : les
// fiches dossier s'ouvraient sur des onglets vides.
//
// Le contenu suit l'ÉTAPE du dossier, sinon la démonstration ment : un dossier au sourcing
// n'a pas de due diligence achevée ni de passage en comité d'investissement, et un dossier
// au closing ne peut pas avoir une instruction vierge. Le volume d'information croît donc
// avec l'avancement — c'est exactement ce que l'écran doit montrer.
//
//   node scripts/seed_demo_deals.mjs
//   node scripts/seed_demo_deals.mjs --clean

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const clean = process.argv.includes("--clean");

const iso = (d) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

// Profondeur d'instruction attendue à chaque étape.
const DEPTH = {
  Sourcing: 1, Analyse: 2, "Pipeline avancé": 3, "Due Diligence": 4,
  "Négociation": 5, Closing: 5, Investi: 5, Perdu: 3,
};

const THESES = {
  AgriLog: "Négoce agricole structuré autour de trois plateformes régionales. La marge se joue sur la logistique du dernier kilomètre, aujourd'hui sous-traitée : l'internaliser améliorerait la marge de 4 à 6 points.",
  AgroSahel: "Transformation de céréales locales avec un approvisionnement contractualisé auprès de coopératives. Position rare sur un marché fragmenté ; l'enjeu est la montée en capacité sans dégrader la qualité.",
  BatiPro: "Matériaux de construction sur un marché porté par l'urbanisation. Rentabilité établie, gouvernance à structurer avant toute accélération.",
  CliniqPlus: "Réseau de cliniques de proximité. Modèle éprouvé sur deux sites, réplicable ; le financement porte sur l'ouverture de trois établissements.",
  EduTech: "Plateforme de soutien scolaire au format mobile. Traction réelle mais monétisation encore incertaine — à réexaminer après deux trimestres.",
  FinLoop: "Agrégateur de paiements pour commerçants informels. Marché considérable, exécution exigeante et concurrence bien financée.",
  KweeziPay: "Paiement mobile pour les PME. Croissance forte, unité économique désormais positive.",
  LogiTrans: "Transport et entreposage sous température dirigée. Actif rare dans le pays ; la question est la solidité du carnet de commandes.",
};

const NOTES = [
  { type: "Réunion", d: -45, participants: "Dirigeant, chargé d'investissement", summary: "Première rencontre : présentation de l'activité, des associés et du besoin de financement. Ambiance de confiance, comptes à obtenir." },
  { type: "Appel", d: -28, participants: "Dirigeant, analyste", summary: "Précisions sur la saisonnalité du chiffre d'affaires et sur la dépendance aux deux premiers clients." },
  { type: "Réunion", d: -14, participants: "Direction, dirigeant, expert-comptable", summary: "Revue des comptes des trois derniers exercices. Retraitements identifiés sur les stocks et les comptes courants d'associés." },
  { type: "Visite", d: -7, participants: "Chargé d'investissement, analyste", summary: "Visite du site de production et entretien avec l'encadrement intermédiaire. Outil de travail correctement entretenu." },
];

const TASKS = [
  // La première est OUVERTE : un dossier sans prochaine étape est un dossier qui dort,
  // et le seed ne doit pas fabriquer cette situation dès le sourcing.
  { title: "Qualifier l'opportunité et planifier un premier échange", status: "À faire", d: 5 },
  { title: "Obtenir les états financiers certifiés des trois derniers exercices", status: "Fait", d: -25 },
  { title: "Vérifier les comptes courants d'associés et les engagements hors bilan", status: "En cours", d: -4 },
  { title: "Organiser la visite du site de production", status: "Fait", d: -10 },
  { title: "Préparer la note de comité d'investissement", status: "À faire", d: 12 },
];

const DD_ITEMS = [
  { domain: "Financière", item: "Revue des comptes des trois derniers exercices", status: "Terminé" },
  { domain: "Financière", item: "Analyse du besoin en fonds de roulement et de la saisonnalité", status: "En cours" },
  { domain: "Juridique & fiscale", item: "Statuts, registre du commerce et titres de propriété", status: "Terminé" },
  { domain: "Juridique & fiscale", item: "Situation fiscale et sociale à jour", status: "Point d'attention" },
  { domain: "Commerciale", item: "Concentration du portefeuille clients", status: "Point d'attention" },
  { domain: "Opérationnelle", item: "Capacité de production et état de l'outil", status: "Terminé" },
  { domain: "RH & social", item: "Contrats de travail et affiliation à la sécurité sociale", status: "En cours" },
  { domain: "ESG", item: "Liste d'exclusion et classification du risque environnemental", status: "Terminé" },
  { domain: "Gouvernance", item: "Composition de l'actionnariat et pacte envisagé", status: "En cours" },
];

const ESG_ACTIONS = [
  { category: "E", action: "Mettre en conformité le stockage et l'évacuation des déchets", status: "À lancer", d: 60 },
  { category: "S", action: "Régulariser les contrats de travail avant le décaissement", status: "En cours", d: 30 },
  { category: "G", action: "Instaurer un conseil trimestriel avec un administrateur indépendant", status: "À lancer", d: 90 },
];

const VALUE = [
  { lever: "Croissance & commercial", initiative: "Diversifier le portefeuille clients pour réduire la concentration", status: "Planifiée", d: 120, impact: "Moins de 30 % du chiffre d'affaires sur le premier client" },
  { lever: "Structuration financière", initiative: "Mettre en place un suivi de trésorerie hebdomadaire", status: "Planifiée", d: 60, impact: "Anticipation des tensions de trésorerie" },
  { lever: "Gouvernance & management", initiative: "Recruter un directeur administratif et financier", status: "Planifiée", d: 150, impact: "Fiabilité et régularité du reporting" },
];

const KPIS = [
  { category: "Financier", name: "Chiffre d'affaires", unit: "FCFA", direction: "high" },
  { category: "Financier", name: "Excédent brut d'exploitation", unit: "FCFA", direction: "high" },
  { category: "Commercial", name: "Nombre de clients actifs", unit: "nb", direction: "high" },
  { category: "Management", name: "Effectif total", unit: "nb", direction: "high" },
];

const COMMITTEES = [
  { committee_type: "Comité d'ouverture de dossier", d: -40, decision: "Favorable", outcome: null,
    conditions: "Poursuivre l'instruction, obtenir les comptes certifiés." },
  { committee_type: "Comité d'investissement", d: -6, decision: "Favorable sous conditions", outcome: "Investissement",
    conditions: "Régularisation sociale préalable et nomination d'un administrateur indépendant." },
];

const DOCS = [
  { title: "Présentation de l'entreprise", category: "Autre" },
  { title: "États financiers transmis", category: "Financier" },
  { title: "Note d'instruction", category: "Comité" },
];

const { data: deals } = await db.from("deals").select("id, company_name, stage, amount, thesis, deal_state");

if (clean) {
  const ids = (deals ?? []).map((d) => d.id);
  for (const [t, col] of [["notes", "entity_id"], ["tasks", "entity_id"], ["dd_items", "entity_id"],
    ["esg_actions", "entity_id"], ["value_creation", "entity_id"]]) {
    await db.from(t).delete().in(col, ids);
  }
  console.log("Données de démonstration des dossiers retirées.");
  process.exit(0);
}

const stats = { theses: 0, notes: 0, tasks: 0, dd: 0, esg: 0, value: 0, kpis: 0, committees: 0, docs: 0, contacts: 0 };

for (const d of deals ?? []) {
  const depth = DEPTH[d.stage] ?? 2;
  const has = async (t, col, extra = {}) =>
    ((await db.from(t).select("id", { count: "exact", head: true }).eq(col, d.id).match(extra)).count ?? 0) > 0;

  // --- Thèse d'investissement : elle existe dès qu'on instruit sérieusement ---
  if (!d.thesis && depth >= 2 && THESES[d.company_name]) {
    await db.from("deals").update({ thesis: THESES[d.company_name] }).eq("id", d.id);
    stats.theses++;
  }

  // --- Suivi : le nombre d'échanges croît avec l'avancement ---
  if (!(await has("notes", "entity_id", { entity_type: "deal" }))) {
    const rows = NOTES.slice(0, Math.min(depth, NOTES.length)).map((n) => ({
      entity_type: "deal", entity_id: d.id, type: n.type, note_date: iso(n.d),
      participants: n.participants, summary: n.summary,
    }));
    if (rows.length) { await db.from("notes").insert(rows); stats.notes += rows.length; }
  }
  if (!(await has("tasks", "entity_id", { entity_type: "deal" }))) {
    const rows = TASKS.slice(0, Math.min(depth, TASKS.length)).map((t) => ({
      entity_type: "deal", entity_id: d.id, title: t.title, status: t.status,
      due_date: iso(t.d), source: "démonstration",
    }));
    if (rows.length) { await db.from("tasks").insert(rows); stats.tasks += rows.length; }
  }

  // --- Due diligence : elle ne commence qu'à partir du stade avancé ---
  if (depth >= 3 && !(await has("dd_items", "entity_id", { entity_type: "deal" }))) {
    const n = depth >= 4 ? DD_ITEMS.length : 4;
    const rows = DD_ITEMS.slice(0, n).map((x) => ({
      entity_type: "deal", entity_id: d.id, domain: x.domain, item: x.item,
      // Tant que la due diligence est en cours, tout n'est pas bouclé.
      status: depth >= 4 ? x.status : "À faire",
    }));
    await db.from("dd_items").insert(rows); stats.dd += rows.length;
  }

  // --- ESG et création de valeur : pertinents seulement sur un dossier engagé ---
  if (depth >= 3) {
    if (!(await has("esg_assessments", "entity_id", { entity_type: "deal" }))) {
      await db.from("esg_assessments").insert({
        entity_type: "deal", entity_id: d.id, exclusion_ok: true, risk_category: depth >= 4 ? "B" : "C",
      });
    }
    if (!(await has("esg_actions", "entity_id", { entity_type: "deal" }))) {
      const rows = ESG_ACTIONS.map((a) => ({
        entity_type: "deal", entity_id: d.id, category: a.category, action: a.action,
        status: a.status, date_end_plan: iso(a.d), responsible_code: "RI",
      }));
      await db.from("esg_actions").insert(rows); stats.esg += rows.length;
    }
    if (!(await has("value_creation", "entity_id", { entity_type: "deal" }))) {
      const rows = VALUE.map((v) => ({
        entity_type: "deal", entity_id: d.id, lever: v.lever, initiative: v.initiative,
        status: v.status, target_date: iso(v.d), impact: v.impact,
      }));
      await db.from("value_creation").insert(rows); stats.value += rows.length;
    }
  }

  // --- KPIs suivis pendant l'instruction ---
  if (depth >= 3) {
    const existing = (await db.from("tracked_kpis").select("id, name").eq("entity_type", "deal").eq("entity_id", d.id)).data ?? [];
    const byName = new Map(existing.map((k) => [k.name, k.id]));
    for (const k of KPIS) {
      if (byName.has(k.name)) continue;
      const { data } = await db.from("tracked_kpis")
        .insert({ entity_type: "deal", entity_id: d.id, kind: "business", category: k.category, name: k.name, unit: k.unit, direction: k.direction })
        .select("id").single();
      if (data) { byName.set(k.name, data.id); stats.kpis++; }
    }
    const base = Number(d.amount ?? 100 * 1_000_000) * 1.6;
    const rows = [];
    [2024, 2025].forEach((year, i) => {
      const ca = base / Math.pow(1.25, 1 - i);
      const vals = {
        "Chiffre d'affaires": Math.round(ca),
        "Excédent brut d'exploitation": Math.round(ca * 0.17),
        "Nombre de clients actifs": Math.round(ca / 1_400_000),
        "Effectif total": Math.round(ca / 9_000_000),
      };
      for (const [name, value] of Object.entries(vals)) {
        const id = byName.get(name);
        if (id) rows.push({ tracked_kpi_id: id, period: String(year), value });
      }
    });
    if (rows.length) await db.from("kpi_values").upsert(rows, { onConflict: "tracked_kpi_id,period" });
  }

  // --- Comités : le passage en comité d'investissement suppose un dossier mûr ---
  if (depth >= 3 && !(await has("committee_passages", "deal_id"))) {
    const rows = COMMITTEES.slice(0, depth >= 5 ? 2 : 1).map((c) => ({
      deal_id: d.id, committee_type: c.committee_type, session_date: iso(c.d),
      decision: c.decision, conditions: c.conditions, outcome: c.outcome,
      status: "Proposée", participants: "Direction, chargé d'investissement, analyste",
    }));
    await db.from("committee_passages").insert(rows); stats.committees += rows.length;
  }

  // --- Documents et contacts ---
  if (!(await has("documents", "deal_id"))) {
    const rows = DOCS.slice(0, Math.min(depth, DOCS.length)).map((x) => ({
      title: `${x.title} — ${d.company_name}`, category: x.category, deal_id: d.id,
    }));
    if (rows.length) { await db.from("documents").insert(rows); stats.docs += rows.length; }
  }
  if (!(await has("contacts", "deal_id"))) {
    await db.from("contacts").insert([{
      name: `Dirigeant ${d.company_name}`, function: "Dirigeant·e", organization: d.company_name,
      org_type: "Entreprise", email: `direction@${d.company_name.toLowerCase().replace(/[^a-z]/g, "")}.bj`, deal_id: d.id,
    }]);
    stats.contacts++;
  }

  console.log(`${d.company_name.padEnd(13)} ${(d.stage ?? "").padEnd(16)} instruction ${depth}/5`);
}

console.log(`\n${JSON.stringify(stats, null, 1)}`);
