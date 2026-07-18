import { createClient } from "@/lib/supabase/server";
import { computeTvpi } from "@/lib/format";

export type PortfolioCompany = {
  id: string;
  name: string;
  sector: string | null;
  status: string;
  trackingType: "equity" | "accompagnement";
  invested: number;
  valuation: number;
  tvpi: number | null;
  tri: number | null;
  ownership: number | null;
  investedDate: string | null;
  subSectorId: string | null;
  programId: string | null;
  /** Tous les programmes dont la société relève actuellement, principal compris. */
  programIds: string[];
  programName: string | null;
  programColor: string | null;
  programStatus: string | null;
  ehsSector: string | null;
};

export type PortfolioProgram = { id: string; name: string; color: string; status: string; ehsFamilies: string[] };
export type SubSectorOption = { id: string; name: string; industry: string };

export type PortfolioData = {
  companies: PortfolioCompany[];
  programs: PortfolioProgram[];
  subSectors: SubSectorOption[];
};

export async function getPortfolioData(): Promise<PortfolioData> {
  const supabase = await createClient();

  const [compRes, progRes, subRes, indRes, memRes] = await Promise.all([
    supabase
      .from("portfolio_companies")
      .select("id, name, status, tracking_type, invested_amount, current_valuation, tvpi, tri, ownership_pct, program_id, primary_sub_sector_id, invested_date, ehs_sector")
      .order("invested_date", { ascending: true }),
    supabase.from("programs").select("id, name, color, status, position, ehs_families").order("position"),
    supabase.from("sub_sectors").select("id, name, industry_id, position").order("position"),
    supabase.from("industries").select("id, name"),
    // Adhésions en cours : une société peut relever de plusieurs programmes à la fois.
    supabase.from("program_memberships").select("entity_id, program_id").eq("entity_type", "company").is("date_end", null),
  ]);

  const programs = progRes.data ?? [];
  // Programmes de chaque société : le principal (program_id) plus toute adhésion ouverte.
  const memberships = new Map<string, string[]>();
  for (const m of memRes.data ?? []) {
    const list = memberships.get(m.entity_id as string) ?? [];
    if (m.program_id && !list.includes(m.program_id as string)) list.push(m.program_id as string);
    memberships.set(m.entity_id as string, list);
  }
  const progMap = new Map(programs.map((p) => [p.id, p]));
  const subMap = new Map((subRes.data ?? []).map((s) => [s.id, s.name]));
  const indMap = new Map((indRes.data ?? []).map((i) => [i.id, i.name]));
  const subSectors = (subRes.data ?? []).map((s) => ({ id: s.id, name: s.name, industry: indMap.get(s.industry_id) ?? "" }));

  const companies: PortfolioCompany[] = (compRes.data ?? []).map((c) => {
    const prog = c.program_id ? progMap.get(c.program_id) : null;
    return {
      id: c.id,
      name: c.name,
      sector: c.primary_sub_sector_id ? subMap.get(c.primary_sub_sector_id) ?? null : null,
      status: c.status,
      trackingType: (c.tracking_type as "equity" | "accompagnement") ?? "equity",
      invested: Number(c.invested_amount ?? 0),
      valuation: Number(c.current_valuation ?? 0),
      tvpi: computeTvpi(Number(c.invested_amount ?? 0), Number(c.current_valuation ?? 0), 0, c.tvpi != null ? Number(c.tvpi) : null),
      tri: c.tri != null ? Number(c.tri) : null,
      ownership: c.ownership_pct != null ? Number(c.ownership_pct) : null,
      investedDate: c.invested_date,
      subSectorId: c.primary_sub_sector_id,
      programId: c.program_id,
      programIds: Array.from(new Set([...(c.program_id ? [c.program_id] : []), ...(memberships.get(c.id) ?? [])])),
      programName: prog?.name ?? null,
      programColor: prog?.color ?? null,
      programStatus: prog?.status ?? null,
      ehsSector: c.ehs_sector ?? null,
    };
  });

  return {
    companies,
    programs: programs.map((p) => ({ id: p.id, name: p.name, color: p.color, status: p.status, ehsFamilies: (p.ehs_families as string[] | null) ?? [] })),
    subSectors,
  };
}
