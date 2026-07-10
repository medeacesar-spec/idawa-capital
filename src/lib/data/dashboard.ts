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

  const [progRes, compRes, dealRes, indRes] = await Promise.all([
    supabase.from("programs").select("id, name, color, nature, position, status").order("position"),
    supabase.from("portfolio_companies").select("invested_amount, current_valuation, tvpi, tri, program_id, status, tracking_type"),
    supabase.from("deals").select("amount, stage, program_id"),
    supabase.from("program_indicators").select("program_id, name, program_indicator_values(period, value)"),
  ]);

  // Programmes actifs uniquement (les clos restent consultables au Portefeuille)
  const programs = (progRes.data ?? []).filter((p) => p.status !== "Clos");
  const allCompanies = compRes.data ?? [];
  // Seules les participations en capital comptent pour les métriques financières.
  const companies = allCompanies.filter((c) => (c.tracking_type ?? "equity") === "equity");
  const deals = dealRes.data ?? [];
  const indicators = indRes.data ?? [];

  // Carte : programme -> { nom indicateur : valeur (T2 2026) }
  const indMap: Record<string, Record<string, number>> = {};
  for (const pi of indicators) {
    const vals = (pi.program_indicator_values ?? []) as { period: string; value: number }[];
    const v = vals.find((x) => x.period === "2026-T2");
    if (!indMap[pi.program_id]) indMap[pi.program_id] = {};
    if (v) indMap[pi.program_id][pi.name] = num(v.value);
  }

  const progMetrics: ProgramMetrics[] = programs.map((p) => {
    const comps = companies.filter((c) => c.program_id === p.id);
    const invested = sum(comps, "invested_amount");
    const valuation = sum(comps, "current_valuation");
    const tvpi = invested > 0 ? valuation / invested : null;
    const tri = comps.length ? sum(comps, "tri") / comps.length : null;
    const pdeals = deals.filter((d) => d.program_id === p.id);
    const active = pdeals.filter((d) => ACTIVE_STAGES.includes(d.stage));
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
      weight,
    };
  });

  const activeDeals = deals.filter((d) => ACTIVE_STAGES.includes(d.stage));
  const funnel = ACTIVE_STAGES.map((s) => {
    const rows = deals.filter((d) => d.stage === s);
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
