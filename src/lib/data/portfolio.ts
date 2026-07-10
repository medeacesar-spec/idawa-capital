import { createClient } from "@/lib/supabase/server";

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
  programId: string | null;
  programName: string | null;
  programColor: string | null;
  programStatus: string | null;
};

export type PortfolioProgram = { id: string; name: string; color: string; status: string };

export type PortfolioData = {
  companies: PortfolioCompany[];
  programs: PortfolioProgram[];
};

export async function getPortfolioData(): Promise<PortfolioData> {
  const supabase = await createClient();

  const [compRes, progRes, subRes] = await Promise.all([
    supabase
      .from("portfolio_companies")
      .select("id, name, status, tracking_type, invested_amount, current_valuation, tvpi, tri, ownership_pct, program_id, primary_sub_sector_id, invested_date")
      .order("invested_date", { ascending: true }),
    supabase.from("programs").select("id, name, color, status, position").order("position"),
    supabase.from("sub_sectors").select("id, name"),
  ]);

  const programs = progRes.data ?? [];
  const progMap = new Map(programs.map((p) => [p.id, p]));
  const subMap = new Map((subRes.data ?? []).map((s) => [s.id, s.name]));

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
      tvpi: c.tvpi != null ? Number(c.tvpi) : null,
      tri: c.tri != null ? Number(c.tri) : null,
      ownership: c.ownership_pct != null ? Number(c.ownership_pct) : null,
      investedDate: c.invested_date,
      programId: c.program_id,
      programName: prog?.name ?? null,
      programColor: prog?.color ?? null,
      programStatus: prog?.status ?? null,
    };
  });

  return {
    companies,
    programs: programs.map((p) => ({ id: p.id, name: p.name, color: p.color, status: p.status })),
  };
}
