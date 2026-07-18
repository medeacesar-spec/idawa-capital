// Suivi de l'accélération d'une entreprise accompagnée.
//
// Les indicateurs sont définis au niveau du PROGRAMME (catalogue configurable), mais ceux
// de portée « entreprise » se saisissent société par société : c'est la seule façon de dire
// ce qui a été fait pour chacune, et d'agréger ensuite au programme sans double compte.

import { createClient } from "@/lib/supabase/server";

export type SupportIndicator = {
  id: string;
  category: string;
  name: string;
  unit: string | null;
  target: number | null;
};

export type SupportValue = { indicatorId: string; period: string; value: number | null };

export type CompanySupport = {
  programId: string | null;
  programName: string | null;
  indicators: SupportIndicator[];
  values: SupportValue[];
  /** Périodes déjà renseignées, les plus récentes en premier. */
  periods: string[];
};

export async function getCompanySupport(companyId: string): Promise<CompanySupport> {
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("portfolio_companies")
    .select("program_id, programs(name)")
    .eq("id", companyId)
    .single();

  const programId = (company?.program_id as string) ?? null;
  const programName = (company?.programs as { name?: string } | null)?.name ?? null;
  if (!programId) return { programId: null, programName, indicators: [], values: [], periods: [] };

  const { data: inds } = await supabase
    .from("program_indicators")
    .select("id, category, name, unit, target, scope, position")
    .eq("program_id", programId)
    .eq("scope", "entreprise")
    .order("position");

  const indicators: SupportIndicator[] = (inds ?? []).map((i) => ({
    id: i.id as string,
    category: i.category as string,
    name: i.name as string,
    unit: (i.unit as string) ?? null,
    target: i.target != null ? Number(i.target) : null,
  }));
  if (indicators.length === 0) return { programId, programName, indicators: [], values: [], periods: [] };

  const { data: vals } = await supabase
    .from("company_indicator_values")
    .select("program_indicator_id, period, value")
    .eq("company_id", companyId)
    .in("program_indicator_id", indicators.map((i) => i.id));

  const values: SupportValue[] = (vals ?? []).map((v) => ({
    indicatorId: v.program_indicator_id as string,
    period: v.period as string,
    value: v.value != null ? Number(v.value) : null,
  }));

  const periods = Array.from(new Set(values.map((v) => v.period))).sort((a, b) => b.localeCompare(a));
  return { programId, programName, indicators, values, periods };
}
