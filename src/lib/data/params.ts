import { createClient } from "@/lib/supabase/server";

export type ProgramRow = {
  id: string;
  name: string;
  color: string;
  nature: "invest" | "accompagnement" | "mixte";
  status: string;
};

export type IndicatorValue = { period: string; value: number | null };

export type ProgramIndicator = {
  id: string; category: string; name: string; unit: string | null; target: number | null;
  /** « programme » : saisi tel quel ici. « entreprise » : somme des saisies par société. */
  scope: string;
  values: IndicatorValue[];
};
export type ProgramConfig = {
  id: string;
  name: string;
  color: string;
  nature: "invest" | "accompagnement" | "mixte";
  status: string;
  esgFramework: string | null;
  esgRequired: boolean;
  ehsFamilies: string[];
  indicators: ProgramIndicator[];
  /** Participations en capital rattachées : passer le programme en accélération les rendrait incohérentes. */
  equityCompanies: number;
};

export async function getProgramConfig(id: string): Promise<ProgramConfig | null> {
  const supabase = await createClient();
  const [pRes, cRes, iRes] = await Promise.all([
    supabase.from("programs").select("id, name, color, nature, status, esg_framework, esg_required, ehs_families").eq("id", id).single(),
    supabase.from("portfolio_companies").select("id", { count: "exact", head: true }).eq("program_id", id).eq("tracking_type", "equity"),
    supabase.from("program_indicators").select("id, category, name, unit, target, scope, program_indicator_values(period, value)").eq("program_id", id).order("position"),
  ]);
  const p = pRes.data;
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    nature: p.nature,
    status: p.status ?? "Actif",
    esgFramework: p.esg_framework,
    esgRequired: p.esg_required ?? true,
    ehsFamilies: (p.ehs_families as string[] | null) ?? [],
    equityCompanies: cRes.count ?? 0,
    indicators: (iRes.data ?? []).map((x) => ({
      id: x.id, category: x.category, name: x.name, unit: x.unit,
      target: x.target != null ? Number(x.target) : null,
      scope: (x.scope as string) ?? "entreprise",
      values: ((x.program_indicator_values ?? []) as { period: string; value: number }[])
        .map((v) => ({ period: v.period, value: v.value != null ? Number(v.value) : null })),
    })),
  };
}

export async function getProgramsForParams(): Promise<ProgramRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("id, name, color, nature, status, position")
    .order("position");
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    nature: p.nature as ProgramRow["nature"],
    status: p.status ?? "Actif",
  }));
}
