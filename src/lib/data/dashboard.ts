import { createClient } from "@/lib/supabase/server";

export type ProgNature = "invest" | "accompagnement" | "mixte";

const ACTIVE_STAGES = ["Sourcing", "Analyse", "Due Diligence", "Négociation", "Closing"];

const num = (v: unknown) => (v == null ? 0 : Number(v));
const sum = <T,>(arr: T[], key: keyof T) => arr.reduce((a, x) => a + num(x[key]), 0);

export type ProgramMetrics = {
  id: string;
  name: string;
  color: string;
  nature: ProgNature;
  invested: number;
  valuation: number;
  tvpi: number | null;
  tri: number | null;
  companies: number;
  budget: number | null;
  disbursed: number | null;
  execRate: number | null;
  pme: number | null;
  jobs: number | null;
  dealsCount: number;
  pipelineAmount: number;
  /** Le détail derrière les chiffres : sans lui, un total ne dit pas de quoi il est fait. */
  portfolioLines: { id: string; name: string; invested: number; valuation: number; status: string; support: boolean }[];
  pipelineLines: { id: string; name: string; stage: string; amount: number }[];
  weight: number; // pour la répartition
};

export type DashboardData = {
  global: {
    invested: number;
    valuation: number;
    tvpi: number | null;
    activeDealsCount: number;
    pipelineAmount: number;
    totalPme: number;
    totalJobs: number;
    funnel: { stage: string; count: number; amount: number }[];
  };
  programs: ProgramMetrics[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const [progRes, compRes, dealRes, indRes, civRes] = await Promise.all([
    supabase.from("programs").select("id, name, color, nature, position, status").order("position"),
    supabase.from("portfolio_companies").select("id, name, invested_amount, current_valuation, tvpi, tri, program_id, status, tracking_type, origin_deal_id"),
    supabase.from("deals").select("id, company_name, amount, stage, program_id, deal_state"),
    supabase.from("program_indicators").select("id, program_id, name, scope, program_indicator_values(period, value)"),
    supabase.from("company_indicator_values").select("company_id, program_indicator_id, period, value"),
  ]);

  // Programmes actifs uniquement (les clos restent consultables au Portefeuille)
  const programs = (progRes.data ?? []).filter((p) => p.status !== "Clos");
  const allCompanies = compRes.data ?? [];
  // Seules les participations en capital comptent pour les métriques financières.
  const companies = allCompanies.filter((c) => (c.tracking_type ?? "equity") === "equity");
  const deals = dealRes.data ?? [];
  const indicators = indRes.data ?? [];
  // Un dossier est réellement « au pipeline actif » s'il est à une étape de l'entonnoir,
  // en état Actif, et pas déjà converti en participation.
  const convertedDealIds = new Set(allCompanies.map((c) => c.origin_deal_id).filter(Boolean));
  const isActiveDeal = (d: { id: string; stage: string; deal_state?: string | null }) =>
    ACTIVE_STAGES.includes(d.stage) && (d.deal_state ?? "Actif") === "Actif" && !convertedDealIds.has(d.id);

  // Deux sources selon la portée de l'indicateur :
  //  · « programme » — la valeur est saisie telle quelle (budget, taux d'exécution, %) ;
  //  · « entreprise » — elle est la SOMME de ce qui a été saisi sur chaque entreprise
  //    du programme, ce qui évite de ressaisir un total et de le voir diverger.
  const companyValues = civRes.data ?? [];
  const programOfCompany = new Map(allCompanies.map((c) => [c.id as string, c.program_id as string | null]));

  // CHAQUE indicateur suit sa PROPRE dernière période renseignée. Une période unique pour
  // tous serait piégeuse : une seule saisie dans un trimestre plus récent suffirait à faire
  // passer tous les autres indicateurs à « — », comme s'ils n'étaient pas renseignés.
  const indMap: Record<string, Record<string, number>> = {};
  for (const pi of indicators) {
    const progId = pi.program_id as string;
    if (!indMap[progId]) indMap[progId] = {};

    if ((pi.scope as string) === "entreprise") {
      const mine = companyValues.filter(
        (v) => v.program_indicator_id === pi.id && programOfCompany.get(v.company_id as string) === progId
      );
      if (mine.length === 0) continue;
      const last = mine.map((v) => v.period as string).sort((a, b) => b.localeCompare(a))[0];
      const total = mine.filter((v) => v.period === last).reduce((a, v) => a + num(v.value), 0);
      indMap[progId][pi.name as string] = total;
    } else {
      const vals = (pi.program_indicator_values ?? []) as { period: string; value: number }[];
      if (vals.length === 0) continue;
      const last = [...vals].sort((a, b) => b.period.localeCompare(a.period))[0];
      indMap[progId][pi.name as string] = num(last.value);
    }
  }

  const progMetrics: ProgramMetrics[] = programs.map((p) => {
    const comps = companies.filter((c) => c.program_id === p.id);
    const invested = sum(comps, "invested_amount");
    const valuation = sum(comps, "current_valuation");
    const tvpi = invested > 0 ? valuation / invested : null;
    const tri = comps.length ? sum(comps, "tri") / comps.length : null;
    const pdeals = deals.filter((d) => d.program_id === p.id);
    const active = pdeals.filter(isActiveDeal);
    const ind = indMap[p.id] ?? {};
    const budget = ind["Budget alloué"] ?? null;
    const disbursed = ind["Montant décaissé"] ?? null;
    const weight = invested > 0 ? invested : budget ?? 0;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      nature: p.nature as ProgNature,
      invested,
      valuation,
      tvpi,
      tri,
      companies: comps.length,
      budget,
      disbursed,
      execRate: ind["Taux d'exécution budgétaire"] ?? null,
      pme: ind["PME/entreprises accompagnées"] ?? null,
      jobs: ind["Emplois créés"] ?? null,
      dealsCount: pdeals.length,
      pipelineAmount: sum(active, "amount"),
      // Mêmes règles que les tuiles au-dessus : programme principal, entités vivantes.
      portfolioLines: allCompanies
        .filter((c) => c.program_id === p.id && c.status !== "Sorti" && c.status !== "Radié")
        .map((c) => ({
          id: c.id as string,
          name: (c.name as string) ?? "—",
          invested: num(c.invested_amount),
          valuation: num(c.current_valuation),
          status: (c.status as string) ?? "Actif",
          support: (c.tracking_type ?? "equity") !== "equity",
        }))
        .sort((a, b) => b.invested - a.invested || a.name.localeCompare(b.name)),
      pipelineLines: active
        .map((d) => ({
          id: d.id as string,
          name: (d.company_name as string) ?? "—",
          stage: (d.stage as string) ?? "—",
          amount: num(d.amount),
        }))
        .sort((a, b) => b.amount - a.amount),
      weight,
    };
  });

  const activeDeals = deals.filter(isActiveDeal);
  const funnel = ACTIVE_STAGES.map((s) => {
    const rows = activeDeals.filter((d) => d.stage === s);
    return { stage: s, count: rows.length, amount: sum(rows, "amount") };
  });

  return {
    global: {
      invested: sum(companies, "invested_amount"),
      valuation: sum(companies, "current_valuation"),
      tvpi: sum(companies, "invested_amount") > 0 ? sum(companies, "current_valuation") / sum(companies, "invested_amount") : null,
      activeDealsCount: activeDeals.length,
      pipelineAmount: sum(activeDeals, "amount"),
      totalPme: progMetrics.reduce((a, p) => a + num(p.pme), 0),
      totalJobs: progMetrics.reduce((a, p) => a + num(p.jobs), 0),
      funnel,
    },
    programs: progMetrics,
  };
}
