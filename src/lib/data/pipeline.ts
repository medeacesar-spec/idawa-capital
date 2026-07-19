import { createClient } from "@/lib/supabase/server";

export type PipelineDeal = {
  id: string;
  companyName: string;
  stage: string;
  amount: number;
  probability: number | null;
  programId: string | null;
  /** Tous les programmes dont le dossier relève, principal compris. */
  programIds: string[];
  programName: string | null;
  programColor: string | null;
  sector: string | null;
  officer: string | null;
  analyst: string | null;
  subSectorId: string | null;
  officerId: string | null;
  analystId: string | null;
  expectedClose: string | null;
  convertedCompanyId: string | null;
  dealState: string;
  rejectionReason: string | null;
  standbyReason: string | null;
  source: string | null;
  sourceDetail: string | null;
};

export type PipelineProgram = { id: string; name: string; color: string };
export type PipelineSubSector = { id: string; name: string; industry: string };
export type PipelineMember = { id: string; name: string };

export type PipelineData = {
  deals: PipelineDeal[];
  programs: PipelineProgram[];
  subSectors: PipelineSubSector[];
  members: PipelineMember[];
};

const displayName = (p?: { full_name?: string | null; email?: string | null } | null) =>
  p ? p.full_name || p.email || null : null;

export async function getPipelineData(): Promise<PipelineData> {
  const supabase = await createClient();

  const [dealRes, progRes, subRes, indRes, profRes, convRes, memRes] = await Promise.all([
    supabase
      .from("deals")
      .select("id, company_name, stage, amount, probability, program_id, primary_sub_sector_id, investment_officer_id, analyst_id, expected_close, created_at, deal_state, rejection_reason, standby_reason, deal_source, deal_source_detail")
      .order("created_at", { ascending: false }),
    supabase.from("programs").select("id, name, color, position, status").order("position"),
    supabase.from("sub_sectors").select("id, name, industry_id, position").order("position"),
    supabase.from("industries").select("id, name"),
    supabase.from("profiles").select("id, full_name, email"),
    supabase.from("portfolio_companies").select("id, origin_deal_id").not("origin_deal_id", "is", null),
    // Adhésions en cours : un dossier peut relever de plusieurs programmes à la fois.
    supabase.from("program_memberships").select("entity_id, program_id").eq("entity_type", "deal").is("date_end", null),
  ]);

  const allPrograms = progRes.data ?? [];
  const programs = allPrograms.filter((p) => p.status !== "Clos");
  const progMap = new Map(allPrograms.map((p) => [p.id, p]));
  // Programmes de chaque dossier : le principal plus toute adhésion ouverte.
  const dealPrograms = new Map<string, string[]>();
  for (const m of memRes.data ?? []) {
    const list = dealPrograms.get(m.entity_id as string) ?? [];
    if (m.program_id && !list.includes(m.program_id as string)) list.push(m.program_id as string);
    dealPrograms.set(m.entity_id as string, list);
  }
  const subMap = new Map((subRes.data ?? []).map((s) => [s.id, s.name]));
  const indMap = new Map((indRes.data ?? []).map((i) => [i.id, i.name]));
  const profMap = new Map((profRes.data ?? []).map((p) => [p.id, p]));
  const convMap = new Map((convRes.data ?? []).map((c) => [c.origin_deal_id, c.id]));

  const deals: PipelineDeal[] = (dealRes.data ?? []).map((d) => {
    const prog = d.program_id ? progMap.get(d.program_id) : null;
    return {
      id: d.id,
      companyName: d.company_name,
      stage: d.stage,
      amount: Number(d.amount ?? 0),
      probability: d.probability,
      programId: d.program_id,
      programIds: Array.from(new Set([...(d.program_id ? [d.program_id] : []), ...(dealPrograms.get(d.id) ?? [])])),
      programName: prog?.name ?? null,
      programColor: prog?.color ?? null,
      sector: d.primary_sub_sector_id ? subMap.get(d.primary_sub_sector_id) ?? null : null,
      officer: displayName(d.investment_officer_id ? profMap.get(d.investment_officer_id) : null),
      analyst: displayName(d.analyst_id ? profMap.get(d.analyst_id) : null),
      subSectorId: d.primary_sub_sector_id,
      officerId: d.investment_officer_id,
      analystId: d.analyst_id,
      expectedClose: d.expected_close,
      convertedCompanyId: convMap.get(d.id) ?? null,
      dealState: d.deal_state ?? "Actif",
      rejectionReason: d.rejection_reason ?? null,
      standbyReason: d.standby_reason ?? null,
      source: d.deal_source ?? null,
      sourceDetail: d.deal_source_detail ?? null,
    };
  });

  return {
    deals,
    programs: programs.map((p) => ({ id: p.id, name: p.name, color: p.color })),
    subSectors: (subRes.data ?? []).map((s) => ({ id: s.id, name: s.name, industry: indMap.get(s.industry_id) ?? "" })),
    members: (profRes.data ?? []).map((p) => ({ id: p.id, name: p.full_name || p.email || "" })),
  };
}
