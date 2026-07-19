// Rapport ESG & Impact annuel — matière chiffrée du modèle IPDEV.
//
// Le modèle IPDEV est un PowerPoint de 30 à 50 pages, moitié récit et moitié chiffres.
// L'outil produit la MOITIÉ CHIFFRÉE, dans l'ordre du modèle, prête à être reprise :
// agrégats emplois, genre, répartitions, notation d'impact, plans d'action E&S, revue
// par entreprise. Le récit, les photos et les études de cas restent la plume du fonds.
//
// Deuxième principe : ce que le modèle attend mais que l'outil ne sait PAS encore
// produire est listé explicitement (`missing`). Un rapport qui tait ses trous laisse
// croire qu'ils n'existent pas.

import { createClient } from "@/lib/supabase/server";

export type Breakdown = { label: string; count: number; amount: number };
export type JobFigure = { label: string; value: number | null; previous: number | null; companies: number };
export type CompanyLine = {
  id: string;
  name: string;
  sector: string | null;
  program: string | null;
  invested: number;
  riskCategory: string | null;
  impactScore: number | null;
  impactMax: number | null;
  headcount: number | null;
  actionsTotal: number;
  actionsDone: number;
};
export type MissingItem = { label: string; why: string };

export type EsgAnnualReport = {
  year: number;
  years: number[];

  key: {
    companies: number;
    newThisYear: number;
    exited: number;
    invested: number;
    investedThisYear: number;
    accompanied: number;
    programs: number;
  };

  bySector: Breakdown[];
  byCountry: Breakdown[];
  byProgram: Breakdown[];

  jobs: JobFigure[];

  gender: { label: string; value: number | null; unit: string | null }[];

  esg: {
    byRisk: { level: string; count: number }[];
    rated: number;
    impactAverage: number | null;
    impactMax: number;
    impactByDimension: { dimension: string; score: number; max: number }[];
    actionsTotal: number;
    actionsDone: number;
    actionsLate: number;
    actionsByCategory: { category: string; total: number; done: number }[];
  };

  governance: { committees: number; validated: number; companiesWithCommittee: number };

  companies: CompanyLine[];
  missing: MissingItem[];
};

/** Le modèle IPDEV attend ces indicateurs ; l'outil ne les collecte pas encore. */
const MISSING: MissingItem[] = [
  { label: "Taux de formalisation des emplois", why: "Aucun champ ne distingue emploi formel et informel — à collecter par le questionnaire d'impact annuel." },
  { label: "Emplois temporaires et part saisonnière", why: "Seul l'effectif permanent est suivi aujourd'hui." },
  { label: "Petits producteurs soutenus et montant dépensé auprès d'eux", why: "Indicateur de chaîne d'approvisionnement, non modélisé." },
  { label: "Part des biens et services alignés aux ODD", why: "Le rattachement d'une activité à un ODD n'est pas saisi." },
  { label: "Salaire décent, couverture maladie, personnes exclues du marché du travail", why: "Sous-critères du rating d'impact IPDEV2, non saisis entreprise par entreprise." },
];

const num = (v: unknown) => (v == null ? 0 : Number(v));

/** Dernière valeur d'un KPI dans l'année : les périodes sont « 2025 » ou « 2025-T3 ». */
function latestInYear(series: { period: string; value: number }[], year: number): number | null {
  const inYear = series
    .filter((p) => String(p.period).startsWith(String(year)))
    .sort((a, b) => a.period.localeCompare(b.period));
  return inYear.length ? inYear[inYear.length - 1].value : null;
}

export async function getEsgAnnualReport(year?: number): Promise<EsgAnnualReport> {
  const supabase = await createClient();

  const [coRes, subRes, indRes, progRes, kpiRes, valRes, assessRes, impactRes, actionRes, comRes, piRes, civRes, pivRes] =
    await Promise.all([
      supabase.from("portfolio_companies").select("id, name, country, invested_date, invested_amount, status, tracking_type, primary_sub_sector_id, program_id"),
      supabase.from("sub_sectors").select("id, name, industry_id"),
      supabase.from("industries").select("id, name"),
      supabase.from("programs").select("id, name, nature, status"),
      supabase.from("tracked_kpis").select("id, entity_type, entity_id, name"),
      supabase.from("kpi_values").select("tracked_kpi_id, period, value"),
      supabase.from("esg_assessments").select("entity_type, entity_id, risk_category"),
      supabase.from("esg_impact_ratings").select("entity_type, entity_id, dimension, score, max_score"),
      supabase.from("esg_actions").select("entity_type, entity_id, category, status, date_end_plan"),
      supabase.from("committee_passages").select("company_id, session_date, status"),
      supabase.from("program_indicators").select("id, program_id, name, scope, unit"),
      supabase.from("company_indicator_values").select("company_id, program_indicator_id, period, value"),
      supabase.from("program_indicator_values").select("program_indicator_id, period, value"),
    ]);

  const companies = coRes.data ?? [];
  const equity = companies.filter((c) => (c.tracking_type ?? "equity") === "equity");

  // Années couvertes : entrées au portefeuille et périodes renseignées.
  const yearSet = new Set<number>();
  for (const c of companies) if (c.invested_date) yearSet.add(Number(String(c.invested_date).slice(0, 4)));
  for (const v of valRes.data ?? []) { const y = Number(String(v.period).slice(0, 4)); if (y) yearSet.add(y); }
  for (const v of civRes.data ?? []) { const y = Number(String(v.period).slice(0, 4)); if (y) yearSet.add(y); }
  yearSet.add(new Date().getFullYear());
  const years = [...yearSet].filter((y) => y > 2000).sort((a, b) => b - a);
  const Y = year ?? years[0] ?? new Date().getFullYear();

  const subMap = new Map((subRes.data ?? []).map((s) => [s.id as string, s]));
  const indMap = new Map((indRes.data ?? []).map((i) => [i.id as string, i.name as string]));
  const progMap = new Map((progRes.data ?? []).map((p) => [p.id as string, p]));

  // ---- Résultats clés
  const inYear = (d: string | null) => !!d && String(d).slice(0, 4) === String(Y);
  const upToYear = (d: string | null) => !d || String(d).slice(0, 4) <= String(Y);

  const heldAtYearEnd = equity.filter((c) => upToYear(c.invested_date));
  const accompanied = companies.filter((c) => (c.tracking_type ?? "equity") !== "equity");

  const key = {
    companies: heldAtYearEnd.filter((c) => c.status !== "Sorti").length,
    newThisYear: equity.filter((c) => inYear(c.invested_date)).length,
    exited: heldAtYearEnd.filter((c) => c.status === "Sorti").length,
    invested: heldAtYearEnd.reduce((s, c) => s + num(c.invested_amount), 0),
    investedThisYear: equity.filter((c) => inYear(c.invested_date)).reduce((s, c) => s + num(c.invested_amount), 0),
    accompanied: accompanied.length,
    programs: (progRes.data ?? []).filter((p) => p.status !== "Clos").length,
  };

  // ---- Répartitions : en NOMBRE et en MONTANT, comme le demande le modèle.
  const group = (rows: typeof equity, labelOf: (c: (typeof equity)[number]) => string): Breakdown[] => {
    const m = new Map<string, Breakdown>();
    for (const c of rows) {
      const label = labelOf(c) || "Non renseigné";
      if (!m.has(label)) m.set(label, { label, count: 0, amount: 0 });
      const b = m.get(label)!;
      b.count++;
      b.amount += num(c.invested_amount);
    }
    return [...m.values()].sort((a, b) => b.amount - a.amount || b.count - a.count);
  };

  const industryOf = (c: (typeof equity)[number]) => {
    const sub = c.primary_sub_sector_id ? subMap.get(c.primary_sub_sector_id as string) : null;
    return sub ? (indMap.get(sub.industry_id as string) ?? (sub.name as string)) : "";
  };

  const bySector = group(heldAtYearEnd, industryOf);
  const byCountry = group(heldAtYearEnd, (c) => (c.country as string) ?? "");
  const byProgram = group(heldAtYearEnd, (c) => (c.program_id ? (progMap.get(c.program_id as string)?.name as string) : "") ?? "");

  // ---- Emplois : KPI d'effectif suivi sur les participations, comparé à N-1.
  const kpis = kpiRes.data ?? [];
  const values = valRes.data ?? [];
  const seriesOf = (kpiId: string) =>
    values.filter((v) => v.tracked_kpi_id === kpiId && v.value != null)
      .map((v) => ({ period: String(v.period), value: Number(v.value) }));

  const headcountKpis = kpis.filter((k) => k.entity_type === "company" && /^effectif/i.test(String(k.name)));
  const headcountByCompany = new Map<string, { now: number | null; prev: number | null }>();
  for (const k of headcountKpis) {
    const s = seriesOf(k.id as string);
    const cur = latestInYear(s, Y);
    const prv = latestInYear(s, Y - 1);
    const existing = headcountByCompany.get(k.entity_id as string);
    // Une entreprise peut suivre « Effectif » et « Effectif total » : on garde le plus élevé.
    headcountByCompany.set(k.entity_id as string, {
      now: Math.max(cur ?? 0, existing?.now ?? 0) || (cur ?? existing?.now ?? null),
      prev: Math.max(prv ?? 0, existing?.prev ?? 0) || (prv ?? existing?.prev ?? null),
    });
  }
  const headTotal = [...headcountByCompany.values()].reduce((s, x) => s + (x.now ?? 0), 0);
  const headPrev = [...headcountByCompany.values()].reduce((s, x) => s + (x.prev ?? 0), 0);
  const headCount = [...headcountByCompany.values()].filter((x) => x.now != null && x.now > 0).length;

  // Indicateurs d'accompagnement : emplois créés, soutenus, féminins.
  const pis = piRes.data ?? [];
  const civ = civRes.data ?? [];
  const piv = pivRes.data ?? [];
  const indicatorTotal = (re: RegExp, y: number): { total: number; companies: number } => {
    const matching = pis.filter((p) => re.test(String(p.name)) && (p.unit ?? "").trim() !== "%");
    const ids = new Set(matching.map((p) => p.id as string));
    const rows = civ.filter((v) => ids.has(v.program_indicator_id as string) && String(v.period).startsWith(String(y)) && v.value != null);
    const fromCompanies = rows.reduce((s, v) => s + Number(v.value), 0);
    const progRows = piv.filter((v) => ids.has(v.program_indicator_id as string) && String(v.period).startsWith(String(y)) && v.value != null);
    // Portée « programme » : la valeur est déjà consolidée, on ne l'additionne pas aux entreprises.
    const total = fromCompanies > 0 ? fromCompanies : progRows.reduce((s, v) => s + Number(v.value), 0);
    return { total, companies: new Set(rows.map((v) => v.company_id)).size };
  };

  const created = indicatorTotal(/emplois? cr[ée]{2}s?/i, Y);
  const createdPrev = indicatorTotal(/emplois? cr[ée]{2}s?/i, Y - 1);
  const sustained = indicatorTotal(/emplois? (soutenus|maintenus)/i, Y);
  const sustainedPrev = indicatorTotal(/emplois? (soutenus|maintenus)/i, Y - 1);
  const female = indicatorTotal(/emplois? f[ée]minins?/i, Y);
  const femalePrev = indicatorTotal(/emplois? f[ée]minins?/i, Y - 1);

  const jobs: JobFigure[] = [
    { label: "Effectif permanent des entreprises suivies", value: headTotal || null, previous: headPrev || null, companies: headCount },
    { label: "Emplois créés (programmes d'accélération)", value: created.total || null, previous: createdPrev.total || null, companies: created.companies },
    { label: "Emplois soutenus / maintenus", value: sustained.total || null, previous: sustainedPrev.total || null, companies: sustained.companies },
  ];

  // ---- Genre
  const pctIndicator = (re: RegExp): number | null => {
    const matching = pis.filter((p) => re.test(String(p.name)));
    const ids = new Set(matching.map((p) => p.id as string));
    const rows = [...piv, ...civ].filter((v) => ids.has(v.program_indicator_id as string) && String(v.period).startsWith(String(Y)) && v.value != null);
    if (!rows.length) return null;
    // Une part ne s'additionne pas : on prend la moyenne des programmes concernés.
    return rows.reduce((s, v) => s + Number(v.value), 0) / rows.length;
  };

  const gender = [
    { label: "Emplois féminins créés", value: female.total || null, unit: null },
    { label: "Emplois féminins créés — année précédente", value: femalePrev.total || null, unit: null },
    { label: "Part de femmes bénéficiaires", value: pctIndicator(/femmes? b[ée]n[ée]ficiaires|% femmes/i), unit: "%" },
    { label: "Part de jeunes (moins de 35 ans)", value: pctIndicator(/jeunes/i), unit: "%" },
  ];

  // ---- ESG : risques, notation d'impact, plans d'action
  const assessments = (assessRes.data ?? []).filter((a) => a.entity_type === "company");
  const byRisk = ["A", "B", "C"].map((level) => ({ level, count: assessments.filter((a) => a.risk_category === level).length }));

  const impacts = (impactRes.data ?? []).filter((i) => i.entity_type === "company");
  const scoreByEntity = new Map<string, { score: number; max: number }>();
  const dimAgg = new Map<string, { score: number; max: number }>();
  for (const i of impacts) {
    const e = scoreByEntity.get(i.entity_id as string) ?? { score: 0, max: 0 };
    e.score += num(i.score); e.max += num(i.max_score);
    scoreByEntity.set(i.entity_id as string, e);
    const d = dimAgg.get(String(i.dimension)) ?? { score: 0, max: 0 };
    d.score += num(i.score); d.max += num(i.max_score);
    dimAgg.set(String(i.dimension), d);
  }
  const rated = scoreByEntity.size;
  const impactAverage = rated ? [...scoreByEntity.values()].reduce((s, e) => s + e.score, 0) / rated : null;

  const actions = (actionRes.data ?? []).filter((a) => a.entity_type === "company");
  const today = new Date().toISOString().slice(0, 10);
  const DONE = new Set(["Réalisée", "Abandonnée"]);
  const actionsDone = actions.filter((a) => a.status === "Réalisée").length;
  const actionsLate = actions.filter((a) => a.date_end_plan && String(a.date_end_plan) < today && !DONE.has(String(a.status))).length;
  const catMap = new Map<string, { category: string; total: number; done: number }>();
  for (const a of actions) {
    const c = String(a.category ?? "—");
    if (!catMap.has(c)) catMap.set(c, { category: c, total: 0, done: 0 });
    const e = catMap.get(c)!;
    e.total++;
    if (a.status === "Réalisée") e.done++;
  }

  // ---- Gouvernance : passages en comité de l'année sur les participations.
  const coms = (comRes.data ?? []).filter((c) => c.company_id && String(c.session_date ?? "").slice(0, 4) === String(Y));
  const governance = {
    committees: coms.length,
    validated: coms.filter((c) => c.status === "Validée").length,
    companiesWithCommittee: new Set(coms.map((c) => c.company_id)).size,
  };

  // ---- Revue par entreprise
  const companyLines: CompanyLine[] = heldAtYearEnd
    .map((c) => {
      const sub = c.primary_sub_sector_id ? subMap.get(c.primary_sub_sector_id as string) : null;
      const imp = scoreByEntity.get(c.id as string);
      const acts = actions.filter((a) => a.entity_id === c.id);
      return {
        id: c.id as string,
        name: c.name as string,
        sector: (sub?.name as string) ?? null,
        program: c.program_id ? ((progMap.get(c.program_id as string)?.name as string) ?? null) : null,
        invested: num(c.invested_amount),
        riskCategory: assessments.find((a) => a.entity_id === c.id)?.risk_category ?? null,
        impactScore: imp?.score ?? null,
        impactMax: imp?.max ?? null,
        headcount: headcountByCompany.get(c.id as string)?.now ?? null,
        actionsTotal: acts.length,
        actionsDone: acts.filter((a) => a.status === "Réalisée").length,
      };
    })
    .sort((a, b) => b.invested - a.invested);

  return {
    year: Y, years,
    key, bySector, byCountry, byProgram, jobs, gender,
    esg: {
      byRisk, rated,
      impactAverage,
      impactMax: 32,
      impactByDimension: [...dimAgg].map(([dimension, v]) => ({ dimension, score: v.score, max: v.max })),
      actionsTotal: actions.length, actionsDone, actionsLate,
      actionsByCategory: [...catMap.values()].sort((a, b) => a.category.localeCompare(b.category)),
    },
    governance,
    companies: companyLines,
    missing: MISSING,
  };
}
