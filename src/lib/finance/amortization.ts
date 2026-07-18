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
  actual: boolean;       // true si la ligne reflète un encaissement réel
  settled: boolean;      // true si le prêt est déjà soldé à cette échéance
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

  const rows: ScheduleRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;

  for (let n = 1; n <= total; n++) {
    const date = addMonths(i.firstDueDate, (n - 1) * mpp);

    // Prêt déjà soldé (remboursement anticipé) : plus rien à payer.
    if (balance <= 0.5) {
      rows.push({ n, date, balance: 0, principal: 0, interest: 0, payment: 0, actual: false, settled: true });
      continue;
    }

    const interest = balance * r;
    const real = i.payments?.find((p) => p.periodNo === n && p.paid != null);
    let principalPart = 0;
    let payment = 0;
    let actual = false;

    if (real) {
      // Encaissement réel : tout ce qui dépasse les intérêts amortit le capital.
      // Un paiement supérieur à l'échéance réduit donc le solde par anticipation.
      actual = true;
      payment = real.paid as number;
      principalPart = Math.min(Math.max(0, payment - interest), balance);
      balance -= principalPart;
    } else if (n <= grace) {
      payment = interest; // différé : intérêts seuls
    } else {
      // Échéance prévisionnelle recalculée sur le solde RESTANT et les périodes
      // restantes : après un remboursement anticipé, les échéances futures baissent.
      const remaining = total - n + 1;
      const annuity = r === 0 ? balance / remaining : (balance * r) / (1 - Math.pow(1 + r, -remaining));
      principalPart = Math.min(annuity - interest, balance);
      if (n === total) principalPart = balance; // solde final
      payment = principalPart + interest;
      balance -= principalPart;
    }

    if (balance < 0.5) balance = 0;
    totalInterest += interest;
    totalPaid += payment;
    rows.push({ n, date, balance, principal: principalPart, interest, payment, actual, settled: false });
  }
  return { rows, totalInterest, totalPaid, ratePct, periodsPerYear };
}
