// Calcul d'un échéancier d'amortissement à partir des paramètres d'un instrument de dette.
// Différé = intérêts seuls ; après le différé, amortissement à échéances constantes (annuité).

import type { Instrument } from "@/lib/data/instruments";

export type ScheduleRow = {
  n: number;
  date: string | null;   // ISO
  balance: number;       // solde restant dû (après paiement)
  principal: number;     // amortissement de la période
  interest: number;      // intérêts de la période
  payment: number;       // échéance totale (amortissement + intérêts)
};

export type Schedule = {
  rows: ScheduleRow[];
  totalInterest: number;
  totalPaid: number;
  ratePct: number;       // taux annuel effectif retenu (%)
  periodsPerYear: number;
};

const MONTHS_PER_PERIOD: Record<string, number> = { mensuelle: 1, trimestrielle: 3, semestrielle: 6, annuelle: 12 };

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1 + months, d));
  return base.toISOString().slice(0, 10);
}

// Retourne null si les paramètres minimaux manquent pour calculer.
export function computeSchedule(i: Instrument): Schedule | null {
  const principal = i.amountDisbursed ?? i.amountCommitted;
  const mpp = MONTHS_PER_PERIOD[i.periodicity ?? "trimestrielle"] ?? 3;
  if (!principal || principal <= 0 || !i.durationMonths || i.durationMonths <= 0 || !i.firstDueDate) return null;

  const periodsPerYear = 12 / mpp;
  let ratePct = (i.interestRate ?? 0) + (i.variableRate ?? 0);
  if (i.rateCap != null) ratePct = Math.min(ratePct, i.rateCap);
  const r = ratePct / 100 / periodsPerYear;

  const total = Math.max(1, Math.round(i.durationMonths / mpp));
  const grace = Math.min(total, Math.max(0, Math.round((i.graceMonths ?? 0) / mpp)));
  const amortPeriods = Math.max(1, total - grace);

  // Annuité constante sur la phase d'amortissement.
  const annuity = r === 0 ? principal / amortPeriods : (principal * r) / (1 - Math.pow(1 + r, -amortPeriods));

  const rows: ScheduleRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  for (let n = 1; n <= total; n++) {
    const interest = balance * r;
    let principalPart = 0;
    let payment = 0;
    if (n <= grace) {
      payment = interest; // différé : intérêts seuls
    } else {
      principalPart = annuity - interest;
      if (n === total || principalPart > balance) principalPart = balance; // solde final
      payment = principalPart + interest;
      balance -= principalPart;
    }
    if (balance < 0.5) balance = 0;
    totalInterest += interest;
    totalPaid += payment;
    rows.push({ n, date: addMonths(i.firstDueDate, (n - 1) * mpp), balance, principal: principalPart, interest, payment });
  }
  return { rows, totalInterest, totalPaid, ratePct, periodsPerYear };
}
