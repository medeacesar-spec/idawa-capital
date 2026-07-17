import { createClient } from "@/lib/supabase/server";

export type Instrument = {
  id: string;
  type: string;
  label: string | null;
  currency: string | null;
  amountCommitted: number | null;
  amountDisbursed: number | null;
  grantDate: string | null;
  ownershipPct: number | null;
  valuationMethod: string | null;
  valuation: number | null;
  interestRate: number | null;
  variableRate: number | null;
  rateCap: number | null;
  graceMonths: number | null;
  durationMonths: number | null;
  periodicity: string | null;
  firstDueDate: string | null;
  notes: string | null;
};

const num = (v: unknown) => (v == null ? null : Number(v));

export async function getInstruments(companyId: string): Promise<Instrument[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financing_instruments")
    .select("*")
    .eq("company_id", companyId)
    .order("grant_date", { ascending: true });
  return (data ?? []).map((d) => ({
    id: d.id,
    type: d.type,
    label: d.label,
    currency: d.currency,
    amountCommitted: num(d.amount_committed),
    amountDisbursed: num(d.amount_disbursed),
    grantDate: d.grant_date,
    ownershipPct: num(d.ownership_pct),
    valuationMethod: d.valuation_method,
    valuation: num(d.valuation),
    interestRate: num(d.interest_rate),
    variableRate: num(d.variable_rate),
    rateCap: num(d.rate_cap),
    graceMonths: d.grace_months,
    durationMonths: d.duration_months,
    periodicity: d.periodicity,
    firstDueDate: d.first_due_date,
    notes: d.notes,
  }));
}
