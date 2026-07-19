// Fiche entreprise trimestrielle, au format de suivi I&P / IPDEV.
//
// Le principe : la fiche ne stocke RIEN et ne demande AUCUNE ressaisie. Elle relit ce
// qui est déjà dans l'outil (états financiers OHADA, instruments et échéancier, plan
// d'action E&S, KPIs suivis, décisions de comité, suivi) et le met en forme pour la
// période demandée. Un chiffre qui bouge dans la fiche est un chiffre corrigé à sa
// source, jamais dans le document.
//
// Fonction PURE, sans accès base : elle prend la fiche société déjà chargée. Elle peut
// donc être appelée depuis un composant client sans casser la compilation.

import type { CompanyDetail } from "@/lib/data/companyDetail";
import { computeOhada } from "@/lib/finance/ohada";
import { computeSchedule, paymentBehaviour } from "@/lib/finance/amortization";
import { instrumentKind, INSTRUMENT_TYPES } from "@/lib/ui-constants";

const CA_LABEL = "Chiffre d'affaires";
const EBE_LABEL = "Excédent brut d'exploitation (EBE)";

export type SheetLine = {
  label: string;
  unit: "FCFA" | "%" | null;
  actual: number | null;
  previous: number | null;
  budget: number | null;
};

export type SheetKpi = {
  name: string;
  category: string;
  unit: string | null;
  value: number | null;
  period: string | null;
  target: number | null;
  /** true = la valeur va dans le bon sens par rapport à la cible. */
  onTarget: boolean | null;
};

export type SheetEvent = { date: string | null; kind: string; label: string; detail: string | null };

export type CompanySheet = {
  period: string;
  year: number;
  quarter: number;
  /** Bornes du trimestre, utilisées pour retenir les événements de la période. */
  from: string;
  to: string;

  identity: {
    name: string;
    sector: string | null;
    programs: string[];
    status: string;
    trackingType: string;
    investedDate: string | null;
  };

  investment: {
    invested: number;
    disbursed: number;
    valuation: number;
    tvpi: number | null;
    tri: number | null;
    ownership: number | null;
    instruments: { type: string; label: string | null; committed: number | null; disbursed: number | null; grantDate: string | null }[];
    valuationMethods: string[];
    exitScenarios: string[];
    exitYear: number | null;
  };

  /** null si l'entreprise ne porte aucun instrument de dette. */
  debt: {
    outstanding: number;
    arrears: number;
    nextDue: { date: string | null; amount: number } | null;
    behaviour: ReturnType<typeof paymentBehaviour>;
  } | null;

  financials: { year: number; lines: SheetLine[]; hasData: boolean };

  esg: {
    riskCategory: string | null;
    ehsSector: string | null;
    exclusionOk: boolean | null;
    impactScore: number | null;
    impactMax: number | null;
    actionsTotal: number;
    actionsDone: number;
    actionsLate: SheetEvent[];
  };

  kpis: SheetKpi[];

  /** Accompagnement : null si l'entreprise n'est suivie par aucun indicateur de programme. */
  support: {
    programName: string | null;
    rows: { name: string; category: string; unit: string | null; value: number | null; previous: number | null; target: number | null; cumul: number | null }[];
  } | null;

  /** Faits marquants du trimestre : décisions de comité, réunions, notes. */
  events: SheetEvent[];
  /** Actions ouvertes à la date d'édition, tous horizons confondus. */
  openTasks: SheetEvent[];
  valueCreation: { lever: string | null; initiative: string; owner: string | null; status: string; targetDate: string | null }[];
  contacts: { name: string; function: string | null; email: string | null; phone: string | null }[];
};

/** Bornes ISO d'un trimestre « 2026-T2 ». */
export function quarterBounds(period: string): { year: number; quarter: number; from: string; to: string } {
  const m = period.match(/^(\d{4})-T([1-4])$/);
  const year = m ? Number(m[1]) : new Date().getFullYear();
  const quarter = m ? Number(m[2]) : Math.floor(new Date().getMonth() / 3) + 1;
  const startMonth = (quarter - 1) * 3;
  const from = new Date(Date.UTC(year, startMonth, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, startMonth + 3, 0)).toISOString().slice(0, 10);
  return { year, quarter, from, to };
}

const inRange = (d: string | null, from: string, to: string) => !!d && d.slice(0, 10) >= from && d.slice(0, 10) <= to;

/** Le poste demandé dans la grille Budget & BP, pour un exercice donné. */
function fromGrid(company: CompanyDetail, year: number, label: string, field: "budget" | "actual"): number | null {
  const row = company.finance.financials.find((f) => String(f.period) === String(year) && f.label === label);
  const v = row ? row[field] : null;
  return v == null ? null : Number(v);
}

/** Les chiffres de l'exercice : états financiers d'abord, grille budgétaire en repli. */
function yearFigures(company: CompanyDetail, year: number): Record<string, number> | null {
  const raw = company.statements[year];
  if (!raw || !Object.keys(raw).length) return null;
  return computeOhada(raw);
}

export function buildCompanySheet(company: CompanyDetail, period: string): CompanySheet {
  const { year, quarter, from, to } = quarterBounds(period);
  const today = new Date().toISOString().slice(0, 10);

  // ---- Situation financière : exercice de la période, exercice précédent, budget.
  const cur = yearFigures(company, year);
  const prev = yearFigures(company, year - 1);
  const pick = (v: Record<string, number> | null, code: string, gridLabel: string | null, y: number): number | null => {
    const fromStmt = v?.[code];
    if (fromStmt != null && fromStmt !== 0) return fromStmt;
    return gridLabel ? fromGrid(company, y, gridLabel, "actual") : null;
  };
  const ebeRate = (ca: number | null, ebe: number | null) => (ca && ca !== 0 && ebe != null ? (ebe / ca) * 100 : null);

  const caN = pick(cur, "XB", CA_LABEL, year);
  const caP = pick(prev, "XB", CA_LABEL, year - 1);
  const ebeN = pick(cur, "XD", EBE_LABEL, year);
  const ebeP = pick(prev, "XD", EBE_LABEL, year - 1);
  const caBudget = fromGrid(company, year, CA_LABEL, "budget");
  const ebeBudget = fromGrid(company, year, EBE_LABEL, "budget");

  const lines: SheetLine[] = [
    { label: "Chiffre d'affaires", unit: "FCFA", actual: caN, previous: caP, budget: caBudget },
    { label: "Valeur ajoutée", unit: "FCFA", actual: cur?.XC ?? null, previous: prev?.XC ?? null, budget: null },
    { label: "Excédent brut d'exploitation", unit: "FCFA", actual: ebeN, previous: ebeP, budget: ebeBudget },
    { label: "Taux d'EBE", unit: "%", actual: ebeRate(caN, ebeN), previous: ebeRate(caP, ebeP), budget: ebeRate(caBudget, ebeBudget) },
    { label: "Résultat d'exploitation", unit: "FCFA", actual: cur?.XE ?? null, previous: prev?.XE ?? null, budget: null },
    { label: "Résultat net", unit: "FCFA", actual: cur?.XI ?? null, previous: prev?.XI ?? null, budget: null },
    { label: "Capitaux propres", unit: "FCFA", actual: cur?.CP ?? null, previous: prev?.CP ?? null, budget: null },
  ];
  const hasData = lines.some((l) => l.actual != null || l.previous != null || l.budget != null);

  // ---- Investissement et instruments.
  const disbursed = company.instruments.reduce((s, i) => s + Number(i.amountDisbursed ?? 0), 0);

  // ---- Dette : agrégation des échéanciers de tous les prêts.
  const debtInstruments = company.instruments.filter((i) => instrumentKind(i.type) === "debt");
  let debt: CompanySheet["debt"] = null;
  if (debtInstruments.length) {
    let outstanding = 0;
    let arrears = 0;
    let next: { date: string | null; amount: number } | null = null;
    const merged = { tracked: 0, onTime: 0, late: 0, partial: 0, missed: 0, unrecorded: 0, arrears: 0, avgDaysLate: null as number | null, reliability: null as number | null };
    let lateDaysTotal = 0;
    let lateCount = 0;
    for (const i of debtInstruments) {
      const sched = computeSchedule(i, today);
      if (!sched) continue;
      const b = paymentBehaviour(sched.rows);
      merged.tracked += b.tracked; merged.onTime += b.onTime; merged.late += b.late;
      merged.partial += b.partial; merged.missed += b.missed; merged.unrecorded += b.unrecorded;
      arrears += b.arrears;
      if (b.avgDaysLate != null && b.late > 0) { lateDaysTotal += b.avgDaysLate * b.late; lateCount += b.late; }
      const lastActual = [...sched.rows].reverse().find((r) => r.actual || r.status === "non saisie");
      if (lastActual) outstanding += lastActual.balance;
      const upcoming = sched.rows.find((r) => r.status === "à venir" && !r.settled);
      if (upcoming && (!next || (upcoming.date ?? "9999") < (next.date ?? "9999"))) next = { date: upcoming.date, amount: upcoming.expected };
    }
    merged.arrears = arrears;
    if (lateCount > 0) merged.avgDaysLate = Math.round(lateDaysTotal / lateCount);
    if (merged.tracked > 0) merged.reliability = merged.onTime / merged.tracked;
    debt = { outstanding, arrears, nextDue: next, behaviour: merged };
  }

  // ---- ESG & impact.
  const impacts = company.esg.impacts ?? [];
  const impactScore = impacts.length ? impacts.reduce((s, i) => s + Number(i.score ?? 0), 0) : null;
  const impactMax = impacts.length ? impacts.reduce((s, i) => s + Number(i.maxScore ?? 0), 0) : null;
  const DONE = new Set(["Réalisée", "Abandonnée"]);
  const actionsLate: SheetEvent[] = (company.esg.actions ?? [])
    .filter((a) => a.dateEndPlan && a.dateEndPlan.slice(0, 10) < today && !DONE.has(a.status ?? ""))
    .sort((a, b) => (a.dateEndPlan ?? "").localeCompare(b.dateEndPlan ?? ""))
    .map((a) => ({ date: a.dateEndPlan, kind: a.category ?? "E&S", label: a.action ?? "—", detail: a.status ?? null }));

  // ---- KPIs : dernière valeur connue à la fin du trimestre.
  const kpis: SheetKpi[] = company.kpis.map((k) => {
    const upTo = k.series.filter((p) => p.period <= period).sort((a, b) => a.period.localeCompare(b.period));
    const last = upTo[upTo.length - 1] ?? null;
    const goodHigh = (k.direction ?? "haut") !== "bas";
    const onTarget = last == null || k.target == null ? null : goodHigh ? last.value >= k.target : last.value <= k.target;
    return { name: k.name, category: k.category, unit: k.unit, value: last?.value ?? null, period: last?.period ?? null, target: k.target, onTarget };
  });

  // ---- Accompagnement : valeur du trimestre, trimestre précédent, et cumul depuis l'origine.
  // Le cumul n'a de sens que pour ce qui s'additionne — on ne cumule pas un pourcentage.
  const prevQuarter = quarter === 1 ? `${year - 1}-T4` : `${year}-T${quarter - 1}`;
  const support = company.support.indicators.length
    ? {
        programName: company.support.programName,
        rows: company.support.indicators.map((ind) => {
          const at = (p: string) => company.support.values.find((v) => v.indicatorId === ind.id && v.period === p)?.value ?? null;
          const additive = (ind.unit ?? "").trim() !== "%";
          const upTo = company.support.values.filter((v) => v.indicatorId === ind.id && v.period <= period && v.value != null);
          return {
            name: ind.name, category: ind.category, unit: ind.unit,
            value: at(period), previous: at(prevQuarter), target: ind.target,
            cumul: additive && upTo.length ? upTo.reduce((s, v) => s + Number(v.value), 0) : null,
          };
        }),
      }
    : null;

  // ---- Faits marquants du trimestre.
  const events: SheetEvent[] = [
    ...company.decisions
      .filter((d) => inRange(d.sessionDate, from, to))
      .map((d) => ({ date: d.sessionDate, kind: d.committeeType, label: d.outcome ?? d.decision ?? "—", detail: d.conditions })),
    ...company.notes
      .filter((n) => inRange(n.noteDate, from, to))
      .map((n) => ({ date: n.noteDate, kind: n.type ?? "Note", label: n.summary ?? "—", detail: null })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const TASK_DONE = new Set(["Fait", "Terminée", "Annulée"]);
  const openTasks: SheetEvent[] = company.tasks
    .filter((t) => !TASK_DONE.has(t.status ?? ""))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .map((t) => ({ date: t.dueDate, kind: t.status ?? "À faire", label: t.title, detail: t.assigneeLabel }));

  return {
    period, year, quarter, from, to,
    identity: {
      name: company.name,
      sector: company.sector,
      programs: company.programs.map((p) => p.name + (p.principal ? " (principal)" : "")),
      status: company.status,
      trackingType: company.trackingType,
      investedDate: company.investedDate,
    },
    investment: {
      invested: company.invested,
      disbursed,
      valuation: company.valuation,
      tvpi: company.tvpi,
      tri: company.tri,
      ownership: company.ownership,
      instruments: company.instruments.map((i) => ({
        type: INSTRUMENT_TYPES.find((t) => t.key === i.type)?.label ?? i.type,
        label: i.label, committed: i.amountCommitted, disbursed: i.amountDisbursed, grantDate: i.grantDate,
      })),
      valuationMethods: company.structuration.valuationMethodsCurrent,
      exitScenarios: company.structuration.exitScenarios,
      exitYear: company.structuration.exitYear,
    },
    debt,
    financials: { year, lines, hasData },
    esg: {
      riskCategory: company.esg.assessment?.riskCategory ?? null,
      ehsSector: company.structuration.ehsSector ?? company.esg.assessment?.ehsSector ?? null,
      exclusionOk: company.esg.assessment?.exclusionOk ?? null,
      impactScore, impactMax,
      actionsTotal: (company.esg.actions ?? []).length,
      actionsDone: (company.esg.actions ?? []).filter((a) => a.status === "Réalisée").length,
      actionsLate,
    },
    kpis,
    support,
    events,
    openTasks,
    valueCreation: company.valueCreation
      .filter((v) => v.status !== "Réalisée" && v.status !== "Abandonnée")
      .map((v) => ({ lever: v.lever, initiative: v.initiative, owner: v.owner, status: v.status, targetDate: v.targetDate })),
    contacts: company.contacts.map((c) => ({ name: c.name, function: c.function, email: c.email, phone: c.phone })),
  };
}
