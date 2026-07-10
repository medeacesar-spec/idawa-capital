import { createClient } from "@/lib/supabase/server";

export type PipelineDeal = {
  id: string;
  companyName: string;
  stage: string;
  amount: number;
  probability: number | null;
  programId: string | null;
  programName: string | null;
  programColor: string | null;
  sector: string | null;
  officer: string | null;
  analyst: string | null;
};

export type PipelineProgram = { id: string; name: string; color: string };

export type PipelineData = {
  deals: PipelineDeal[];
  programs: PipelineProgram[];
};

const displayName = (p?: { full_name?: string | null; email?: string | null } | null) =>
  p ? p.full_name || p.email || null : null;

export async function getPipelineData(): Promise<PipelineData> {
  const supabase = await createClient();

  const [dealRes, progRes, subRes, profRes] = await Promise.all([
    supabase
      .from("deals")
      .select("id, company_name, stage, amount, probability, program_id, primary_sub_sector_id, investment_officer_id, analyst_id, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("programs").select("id, name, color, position, status").order("position"),
    supabase.from("sub_sectors").select("id, name"),
    supabase.from("profiles").select("id, full_name, email"),
  ]);

  const allPrograms = progRes.data ?? [];
  const programs = allPrograms.filter((p) => p.status !== "Clos");
  const progMap = new Map(allPrograms.map((p) => [p.id, p]));
  const subMap = new Map((subRes.data ?? []).map((s) => [s.id, s.name]));
  const profMap = new Map((profRes.data ?? []).map((p) => [p.id, p]));

  const deals: PipelineDeal[] = (dealRes.data ?? []).map((d) => {
    const prog = d.program_id ? progMap.get(d.program_id) : null;
    return {
      id: d.id,
      companyName: d.company_name,
      stage: d.stage,
      amount: Number(d.amount ?? 0),
      probability: d.probability,
      programId: d.program_id,
      programName: prog?.name ?? null,
      programColor: prog?.color ?? null,
      sector: d.primary_sub_sector_id ? subMap.get(d.primary_sub_sector_id) ?? null : null,
      officer: displayName(d.investment_officer_id ? profMap.get(d.investment_officer_id) : null),
      analyst: displayName(d.analyst_id ? profMap.get(d.analyst_id) : null),
    };
  });

  return {
    deals,
    programs: programs.map((p) => ({ id: p.id, name: p.name, color: p.color })),
  };
}
