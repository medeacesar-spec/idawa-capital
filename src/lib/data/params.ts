import { createClient } from "@/lib/supabase/server";

export type ProgramRow = {
  id: string;
  name: string;
  color: string;
  nature: "invest" | "accompagnement" | "mixte";
  status: string;
};

export type ProgramIndicator = { id: string; category: string; name: string; unit: string | null; target: number | null };
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
};

export async function getProgramConfig(id: string): Promise<ProgramConfig | null> {
  const supabase = await createClient();
  const [pRes, iRes] = await Promise.all([
    supabase.from("programs").select("id, name, color, nature, status, esg_framework, esg_required, ehs_families").eq("id", id).single(),
    supabase.from("program_indicators").select("id, category, name, unit, target").eq("program_id", id).order("position"),
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
    indicators: (iRes.data ?? []).map((x) => ({ id: x.id, category: x.category, name: x.name, unit: x.unit, target: x.target != null ? Number(x.target) : null })),
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
