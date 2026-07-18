// Calcul d'un échéancier d'amortissement à partir des paramètres d'un instrument de dette.
// Différé = intérêts seuls ; après le différé, amortissement à échéances constantes (annuité).
//
// L'échéancier confronte le PRÉVISIONNEL au RÉEL, échéance par échéance :
//  · payé plus que dû   -> échéance soldée, le surplus amortit le capital, les échéances
//                          suivantes sont recalculées à la baisse (remboursement anticipé) ;
//  · payé moins que dû  -> échéance partielle, le manque reste dû, le capital s'amortit
//                          d'autant moins et les échéances suivantes remontent ;
//  · rien encaissé      -> échéance manquée, le capital ne s'amortit pas du tout.
// L'historique ainsi constitué sert à juger le comportement de paiement de l'entrepreneur.

import type { Instrument } from "@/lib/data/instruments";

/** « non saisie » = échéance passée sans aucune information, à distinguer d'un impayé avéré. */
export type PaymentStatus = "à venir" | "soldée" | "anticipée" | "partielle" | "manquée" | "non saisie";

export type ScheduleRow = {
  n: number;
  date: string | null;   // ISO
  balance: number;       // solde restant dû (après la période)
  principal: number;     // amortissement de la période
  interest: number;      // intérêts de la période
  payment: number;       // échéance THÉORIQUE de la période (prévisionnel)
  expected: number;      // ce qui est réellement attendu : le facturé s'il est saisi, sinon l'échéance
  paid: number;          // encaissement réel (0 si rien)
  shortfall: number;     // manque sur une échéance échue
  surplus: number;       // versement au-delà de l'attendu
  daysLate: number | null; // retard de règlement, si la date de paiement est connue
  status: PaymentStatus;
  actual: boolean;       // true si la ligne reflète un encaissement réel
  settled: boolean;      // true si le prêt est déjà soldé à cette échéance
};

export type Schedule = {
  rows: ScheduleRow[];
  totalInterest: number;
  totalPaid: number;     // total théorique à rembourser (capital + intérêts)
  ratePct: number;       // taux annuel effectif retenu (%)
  periodsPerYear: number;
};

/** Bilan du comportement de paiement, calculé sur les seules échéances RENSEIGNÉES. */
export type PaymentBehaviour = {
  tracked: number;    // échéances renseignées
  onTime: number;     // soldées ou anticipées, réglées à la date ou avant
  late: number;       // soldées mais réglées après l'échéance
  partial: number;
  missed: number;
  unrecorded: number; // échéances passées sans information
  arrears: number;    // somme des manques sur les échéances échues
  avgDaysLate: number | null;
  reliability: number | null; // part des échéances renseignées honorées intégralement (0-1)
};

const MONTHS_PER_PERIOD: Record<string, number> = { mensuelle: 1, trimestrielle: 3, semestrielle: 6, annuelle: 12 };

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1 + months, d));
  return base.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

// Retourne null si les paramètres minimaux manquent pour calculer.
export function computeSchedule(i: Instrument, today = new Date().toISOString().slice(0, 10)): Schedule | null {
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
      rows.push({ n, date, balance: 0, principal: 0, interest: 0, payment: 0, expected: 0, paid: 0,
        shortfall: 0, surplus: 0, daysLate: null, status: "à venir", actual: false, settled: true });
      continue;
    }

    const interest = balance * r;

    // Échéance théorique de la période, recalculée sur le solde RESTANT et les périodes
    // restantes : c'est ce recalcul qui répercute un remboursement anticipé ou un impayé.
    let scheduledPrincipal: number;
    if (n <= grace) {
      scheduledPrincipal = 0; // différé : intérêts seuls
    } else {
      const remaining = total - n + 1;
      const annuity = r === 0 ? balance / remaining : (balance * r) / (1 - Math.pow(1 + r, -remaining));
      scheduledPrincipal = Math.min(Math.max(0, annuity - interest), balance);
      if (n === total) scheduledPrincipal = balance; // solde final
    }
    const payment = scheduledPrincipal + interest;

    const rec = i.payments?.find((p) => p.periodNo === n);
    const expected = rec?.invoiced ?? payment;
    const hasPaid = rec != null && rec.paid != null;
    const paid = hasPaid ? (rec!.paid as number) : 0;
    const past = !!date && date <= today;

    let principalPart: number;
    let status: PaymentStatus;

    if (hasPaid) {
      // Encaissement réel : tout ce qui dépasse les intérêts amortit le capital.
      principalPart = Math.min(Math.max(0, paid - interest), balance);
      if (paid <= 0.5) status = "manquée";
      else if (paid >= expected - 0.5) status = paid > expected + 0.5 ? "anticipée" : "soldée";
      else status = "partielle";
    } else if (past) {
      // Échéance échue sans aucune information : absence de saisie n'est PAS un impayé.
      // On projette donc l'amortissement prévu — sinon un prêt jamais renseigné afficherait
      // un capital jamais amorti et un total à rembourser absurde. La ligne est simplement
      // signalée « non saisie » et comptée dans les arriérés, comme reste à documenter.
      principalPart = scheduledPrincipal;
      status = "non saisie";
    } else {
      principalPart = scheduledPrincipal; // prévisionnel
      status = "à venir";
    }

    balance -= principalPart;
    if (balance < 0.5) balance = 0;

    const shortfall = past ? Math.max(0, expected - paid) : 0;
    const surplus = Math.max(0, paid - expected);
    const daysLate = hasPaid && rec!.paidDate && date ? Math.max(0, daysBetween(date, rec!.paidDate)) : null;

    totalInterest += interest;
    totalPaid += payment;
    rows.push({ n, date, balance, principal: principalPart, interest, payment, expected, paid,
      shortfall, surplus, daysLate, status, actual: hasPaid, settled: false });
  }
  return { rows, totalInterest, totalPaid, ratePct, periodsPerYear };
}

/** Agrège le comportement de paiement sur une ou plusieurs échéances. */
export function paymentBehaviour(rows: ScheduleRow[]): PaymentBehaviour {
  const b: PaymentBehaviour = { tracked: 0, onTime: 0, late: 0, partial: 0, missed: 0, unrecorded: 0,
    arrears: 0, avgDaysLate: null, reliability: null };
  let lateDays = 0;
  let lateCount = 0;

  for (const row of rows) {
    if (row.settled) continue;
    b.arrears += row.shortfall;
    if (row.status === "non saisie") { b.unrecorded++; continue; }
    if (!row.actual) continue;
    b.tracked++;
    if (row.status === "partielle") b.partial++;
    else if (row.status === "manquée") b.missed++;
    else if (row.daysLate != null && row.daysLate > 0) { b.late++; lateDays += row.daysLate; lateCount++; }
    else b.onTime++;
  }
  if (lateCount > 0) b.avgDaysLate = Math.round(lateDays / lateCount);
  if (b.tracked > 0) b.reliability = b.onTime / b.tracked;
  return b;
}
