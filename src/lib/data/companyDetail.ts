import { createClient } from "@/lib/supabase/server";

export type KpiSeries = {
  id: string;
  category: string;
  name: string;
  unit: string | null;
  target: number | null;
  direction: string;
  series: { period: string; value: number }[];
};
export type DetailContact = { id: string; name: string; function: string | null; email: string | null };
export type DetailDoc = { id: string; title: string; category: string | null };

export type CompanyDetail = {
  id: string;
  name: string;
  sector: string | null;
  status: string;
  trackingType: string;
  invested: number;
  valuation: number;
  tvpi: number | null;
  tri: number | null;
  ownership: number | null;
  investedDate: string | null;
  programName: string | null;
  programColor: string | null;
  originDealName: string | null;
  kpis: KpiSeries[];
  contacts: DetailContact[];
  documents: DetailDoc[];
};

export async function getCompanyDetail(id: string): Promise<CompanyDetail | null> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("portfolio_companies")
    .select("id, name, status, tracking_type, invested_amount, current_valuation, tvpi, tri, ownership_pct, invested_date, program_id, primary_sub_sector_id, origin_deal_id")
    .eq("id", id).single();
  if (!c) return null;

  const [progRes, subRes, dealRes, trackedRes, contactRes, docRes] = await Promise.all([
    c.program_id ? supabase.from("programs").select("name, color").eq("id", c.program_id).single() : Promise.resolve({ data: null }),
    c.primary_sub_sector_id ? supabase.from("sub_sectors").select("name").eq("id", c.primary_sub_sector_id).single() : Promise.resolve({ data: null }),
    c.origin_deal_id ? supabase.from("deals").select("company_name").eq("id", c.origin_deal_id).single() : Promise.resolve({ data: null }),
    supabase.from("tracked_kpis").select("id, category, name, unit, target, direction").eq("entity_type", "company").eq("entity_id", id),
    supabase.from("contacts").select("id, name, function, email").eq("company_id", id),
    supabase.from("documents").select("id, title, category").eq("company_id", id),
  ]);

  const tracked = trackedRes.data ?? [];
  let kpis: KpiSeries[] = [];
  if (tracked.length) {
    const { data: vals } = await supabase.from("kpi_values").select("tracked_kpi_id, period, value").in("tracked_kpi_id", tracked.map((t) => t.id)).order("period");
    kpis = tracked.map((t) => ({
      id: t.id, category: t.category, name: t.name, unit: t.unit,
      target: t.target != null ? Number(t.target) : null,
      direction: t.direction ?? "high",
      series: (vals ?? []).filter((v) => v.tracked_kpi_id === t.id).map((v) => ({ period: v.period, value: Number(v.value) })),
    }));
  }

  const prog = progRes.data as { name?: string; color?: string } | null;
  return {
    id: c.id, name: c.name, sector: (subRes.data as { name?: string } | null)?.name ?? null,
    status: c.status, trackingType: c.tracking_type ?? "equity",
    invested: Number(c.invested_amount ?? 0), valuation: Number(c.current_valuation ?? 0),
    tvpi: c.tvpi != null ? Number(c.tvpi) : null, tri: c.tri != null ? Number(c.tri) : null,
    ownership: c.ownership_pct != null ? Number(c.ownership_pct) : null,
    investedDate: c.invested_date, programName: prog?.name ?? null, programColor: prog?.color ?? null,
    originDealName: (dealRes.data as { company_name?: string } | null)?.company_name ?? null,
    kpis, contacts: contactRes.data ?? [], documents: docRes.data ?? [],
  };
}
