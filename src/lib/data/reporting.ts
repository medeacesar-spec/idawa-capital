import { createClient } from "@/lib/supabase/server";

export type RepCompany = { id: string; name: string; programName: string | null };
export type RepStatus = { companyId: string; period: string; status: string; assigneeLabel: string | null };
export type SummaryRow = { name: string; sector: string | null; program: string | null; invested: number; valuation: number; tvpi: number | null; tri: number | null; ownership: number | null; status: string };
export type FinRow = { company: string; period: string; label: string; budget: number | null; actual: number | null };
export type KpiRow = { company: string; category: string; name: string; unit: string | null; period: string; value: number };

export type ReportingData = {
  companies: RepCompany[];
  statuses: RepStatus[];
  periods: string[];
  summary: SummaryRow[];
  financials: FinRow[];
  kpis: KpiRow[];
};

export async function getReportingData(): Promise<ReportingData> {
  const supabase = await createClient();
  const [coRes, progRes, subRes, statusRes, finRes, trackedRes] = await Promise.all([
    supabase.from("portfolio_companies").select("id, name, program_id, primary_sub_sector_id, invested_amount, current_valuation, tvpi, tri, ownership_pct, status, tracking_type").order("name"),
    supabase.from("programs").select("id, name"),
    supabase.from("sub_sectors").select("id, name"),
    supabase.from("company_reporting").select("company_id, period, status, assignee_label"),
    supabase.from("company_financials").select("company_id, period, label, budget, actual"),
    supabase.from("tracked_kpis").select("id, entity_id, category, name, unit").eq("entity_type", "company"),
  ]);
  const companiesRaw = coRes.data ?? [];
  const progMap = new Map((progRes.data ?? []).map((p) => [p.id, p.name]));
  const subMap = new Map((subRes.data ?? []).map((s) => [s.id, s.name]));
  const coName = new Map(companiesRaw.map((c) => [c.id, c.name]));

  const companies: RepCompany[] = companiesRaw
    .filter((c) => c.tracking_type === "equity")
    .map((c) => ({ id: c.id, name: c.name, programName: c.program_id ? progMap.get(c.program_id) ?? null : null }));

  const statuses: RepStatus[] = (statusRes.data ?? []).map((s) => ({ companyId: s.company_id, period: s.period, status: s.status, assigneeLabel: s.assignee_label }));

  const summary: SummaryRow[] = companiesRaw.map((c) => ({
    name: c.name, sector: c.primary_sub_sector_id ? subMap.get(c.primary_sub_sector_id) ?? null : null,
    program: c.program_id ? progMap.get(c.program_id) ?? null : null,
    invested: Number(c.invested_amount ?? 0), valuation: Number(c.current_valuation ?? 0),
    tvpi: c.tvpi != null ? Number(c.tvpi) : null, tri: c.tri != null ? Number(c.tri) : null,
    ownership: c.ownership_pct != null ? Number(c.ownership_pct) : null, status: c.status,
  }));

  const financials: FinRow[] = (finRes.data ?? []).map((f) => ({ company: coName.get(f.company_id) ?? "—", period: f.period, label: f.label, budget: f.budget != null ? Number(f.budget) : null, actual: f.actual != null ? Number(f.actual) : null }));

  const tracked = trackedRes.data ?? [];
  const trackedMap = new Map(tracked.map((t) => [t.id, t]));
  let kpis: KpiRow[] = [];
  if (tracked.length) {
    const { data: vals } = await supabase.from("kpi_values").select("tracked_kpi_id, period, value").in("tracked_kpi_id", tracked.map((t) => t.id));
    kpis = (vals ?? []).map((v) => {
      const t = trackedMap.get(v.tracked_kpi_id);
      return { company: coName.get(t?.entity_id) ?? "—", category: t?.category ?? "", name: t?.name ?? "", unit: t?.unit ?? null, period: v.period, value: Number(v.value) };
    });
  }

  const periodSet = new Set<string>();
  statuses.forEach((s) => periodSet.add(s.period));
  financials.forEach((f) => periodSet.add(f.period));
  kpis.forEach((k) => periodSet.add(k.period));
  let periods = Array.from(periodSet).sort().reverse();
  if (periods.length === 0) periods = ["2026-T2", "2026-T1", "2025"];

  return { companies, statuses, periods, summary, financials, kpis };
}
