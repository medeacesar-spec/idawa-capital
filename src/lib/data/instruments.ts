import { createClient } from "@/lib/supabase/server";

export type InstrumentPayment = {
  id: string;
  periodNo: number;
  dueDate: string | null;
  invoiced: number | null;
  paid: number | null;
  paidDate: string | null;
  note: string | null;
};

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
  payments: InstrumentPayment[];
};

const num = (v: unknown) => (v == null ? null : Number(v));

export async function getInstruments(companyId: string): Promise<Instrument[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financing_instruments")
    .select("*")
    .eq("company_id", companyId)
    .order("grant_date", { ascending: true });

  const ids = (data ?? []).map((d) => d.id);
  const { data: pays } = ids.length
    ? await supabase.from("instrument_payments").select("*").in("instrument_id", ids).order("period_no")
    : { data: [] as Record<string, unknown>[] };
  const payOf = (instrumentId: string): InstrumentPayment[] =>
    (pays ?? []).filter((p) => p.instrument_id === instrumentId).map((p) => ({
      id: p.id as string,
      periodNo: p.period_no as number,
      dueDate: (p.due_date as string) ?? null,
      invoiced: p.amount_invoiced == null ? null : Number(p.amount_invoiced),
      paid: p.amount_paid == null ? null : Number(p.amount_paid),
      paidDate: (p.paid_date as string) ?? null,
      note: (p.note as string) ?? null,
    }));

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
    payments: payOf(d.id),
  }));
}
