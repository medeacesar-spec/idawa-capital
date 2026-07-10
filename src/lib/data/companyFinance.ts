import { createClient } from "@/lib/supabase/server";

export type FinancialRow = { id: string; period: string; label: string; budget: number | null; actual: number | null };
export type FlowRow = { id: string; flowDate: string | null; type: string | null; amount: number | null; note: string | null };
export type CapRow = { id: string; holder: string; holderType: string | null; pct: number | null; shares: number | null; note: string | null };
export type CompanyFinance = { financials: FinancialRow[]; flows: FlowRow[]; capTable: CapRow[] };

export async function getCompanyFinance(companyId: string): Promise<CompanyFinance> {
  const supabase = await createClient();
  const [fRes, flRes, capRes] = await Promise.all([
    supabase.from("company_financials").select("id, period, label, budget, actual").eq("company_id", companyId).order("period", { ascending: false }),
    supabase.from("company_flows").select("id, flow_date, type, amount, note").eq("company_id", companyId).order("flow_date", { ascending: false }),
    supabase.from("company_captable").select("id, holder, holder_type, pct, shares, note").eq("company_id", companyId).order("pct", { ascending: false }),
  ]);
  return {
    financials: (fRes.data ?? []).map((x) => ({ id: x.id, period: x.period, label: x.label, budget: x.budget != null ? Number(x.budget) : null, actual: x.actual != null ? Number(x.actual) : null })),
    flows: (flRes.data ?? []).map((x) => ({ id: x.id, flowDate: x.flow_date, type: x.type, amount: x.amount != null ? Number(x.amount) : null, note: x.note })),
    capTable: (capRes.data ?? []).map((x) => ({ id: x.id, holder: x.holder, holderType: x.holder_type, pct: x.pct != null ? Number(x.pct) : null, shares: x.shares != null ? Number(x.shares) : null, note: x.note })),
  };
}
