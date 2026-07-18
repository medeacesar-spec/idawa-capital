// Échéancier consolidé au niveau du FONDS.
//
// L'échéancier par société répond à « où en est ce prêt ». Celui-ci répond à une autre
// question, de trésorerie : « qu'est-ce que le fonds doit encaisser dans les mois qui
// viennent, et qu'est-ce qui aurait déjà dû rentrer ». Toutes sociétés confondues.

import { createClient } from "@/lib/supabase/server";
import { computeSchedule } from "@/lib/finance/amortization";
import type { Instrument, InstrumentPayment } from "@/lib/data/instruments";
import { INSTRUMENT_TYPES } from "@/lib/ui-constants";

export type ScheduleEntry = {
  companyId: string;
  companyName: string;
  instrumentId: string;
  instrumentLabel: string;
  instrumentType: string;
  periodNo: number;
  dueDate: string;
  amount: number;
  /** Statut de l'échéance, pour distinguer un impayé constaté d'une ligne non renseignée. */
  status: string;
};

export type MonthBucket = { month: string; amount: number };

export type FundSchedule = {
  arrears: ScheduleEntry[];
  upcoming: ScheduleEntry[];
  byMonth: MonthBucket[];
  totalArrears: number;
  totalUpcoming: number;
  /** Encaissements attendus sur les douze prochains mois. */
  next12: number;
  companiesInArrears: number;
};

const num = (v: unknown) => (v == null ? null : Number(v));
const isDebt = (t: string) => (INSTRUMENT_TYPES.find((x) => x.key === t)?.kind ?? "debt") !== "equity";

export async function getFundSchedule(horizonMonths = 12): Promise<FundSchedule> {
  const supabase = await createClient();

  const [instRes, coRes] = await Promise.all([
    supabase.from("financing_instruments").select("*"),
    supabase.from("portfolio_companies").select("id, name, status"),
  ]);

  // Une société sortie ou radiée ne pèse plus sur la trésorerie à venir.
  const companies = new Map(
    (coRes.data ?? [])
      .filter((c) => c.status !== "Sorti" && c.status !== "Radié")
      .map((c) => [c.id as string, c.name as string])
  );

  const rows = (instRes.data ?? []).filter((d) => isDebt(d.type) && companies.has(d.company_id));
  const ids = rows.map((d) => d.id as string);
  const { data: pays } = ids.length
    ? await supabase.from("instrument_payments").select("*").in("instrument_id", ids)
    : { data: [] as Record<string, unknown>[] };

  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + horizonMonths);
  const horizonIso = horizon.toISOString().slice(0, 10);

  const arrears: ScheduleEntry[] = [];
  const upcoming: ScheduleEntry[] = [];

  for (const d of rows) {
    const payments: InstrumentPayment[] = (pays ?? [])
      .filter((p) => p.instrument_id === d.id)
      .map((p) => ({
        id: p.id as string,
        periodNo: p.period_no as number,
        dueDate: (p.due_date as string) ?? null,
        invoiced: p.amount_invoiced == null ? null : Number(p.amount_invoiced),
        paid: p.amount_paid == null ? null : Number(p.amount_paid),
        paidDate: (p.paid_date as string) ?? null,
        note: (p.note as string) ?? null,
      }));

    const instrument = {
      id: d.id, type: d.type, label: d.label, currency: d.currency,
      amountCommitted: num(d.amount_committed), amountDisbursed: num(d.amount_disbursed),
      grantDate: d.grant_date, ownershipPct: num(d.ownership_pct),
      valuationMethod: d.valuation_method, valuation: num(d.valuation),
      interestRate: num(d.interest_rate), variableRate: num(d.variable_rate), rateCap: num(d.rate_cap),
      graceMonths: d.grace_months, durationMonths: d.duration_months,
      periodicity: d.periodicity, firstDueDate: d.first_due_date, notes: d.notes, payments,
    } as Instrument;

    const sched = computeSchedule(instrument, today);
    if (!sched) continue;

    const base = {
      companyId: d.company_id as string,
      companyName: companies.get(d.company_id) ?? "—",
      instrumentId: d.id as string,
      instrumentLabel: (d.label as string) ?? "—",
      instrumentType: d.type as string,
    };

    for (const row of sched.rows) {
      if (row.settled || !row.date) continue;
      if (row.date <= today) {
        if (row.shortfall > 0.5) arrears.push({ ...base, periodNo: row.n, dueDate: row.date, amount: row.shortfall, status: row.status });
      } else if (row.date <= horizonIso) {
        const due = row.expected - row.paid;
        if (due > 0.5) upcoming.push({ ...base, periodNo: row.n, dueDate: row.date, amount: due, status: row.status });
      }
    }
  }

  arrears.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Agrégation mensuelle : c'est le profil de trésorerie, mois par mois.
  const months = new Map<string, number>();
  for (const e of upcoming) {
    const m = e.dueDate.slice(0, 7);
    months.set(m, (months.get(m) ?? 0) + e.amount);
  }
  const byMonth = Array.from(months.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    arrears,
    upcoming,
    byMonth,
    totalArrears: arrears.reduce((a, e) => a + e.amount, 0),
    totalUpcoming: upcoming.reduce((a, e) => a + e.amount, 0),
    next12: upcoming.reduce((a, e) => a + e.amount, 0),
    companiesInArrears: new Set(arrears.map((e) => e.companyId)).size,
  };
}
