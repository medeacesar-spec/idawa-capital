// Fiche d'instruction d'un dossier — le pendant, côté pipeline, de la fiche société.
//
// Une société produit une fiche de suivi trimestrielle ; un dossier au stade avancé
// mérite son document équivalent : où en est l'instruction, ce qu'on sait, ce qui reste.
// Comme la fiche société, elle ne stocke rien et relit ce qui est déjà saisi.
//
// Fonction PURE : prend le DealDetail déjà chargé, aucun accès base.

import type { DealDetail } from "@/lib/data/dealDetail";

export type SheetLine = { label: string; value: string | null };
export type SheetKpi = { name: string; category: string; unit: string | null; value: number | null; period: string | null };
export type SheetEvent = { date: string | null; kind: string; label: string; detail: string | null };

export type DealSheet = {
  identity: {
    name: string;
    sector: string | null;
    programs: string[];
    stage: string;
    state: string;
    officer: string | null;
    analyst: string | null;
    source: string | null;
  };
  facts: SheetLine[];
  thesis: string | null;
  /** Prochaine action : la tâche ouverte la plus proche. */
  nextStep: { title: string; assignee: string | null; dueDate: string | null; late: boolean } | null;
  committees: SheetEvent[];
  dueDiligence: { domain: string; total: number; done: number; attention: number }[];
  ddOpenPoints: SheetEvent[];
  esg: {
    riskCategory: string | null;
    exclusionOk: boolean | null;
    impactScore: number | null;
    impactMax: number | null;
    actionsTotal: number;
    actionsDone: number;
  };
  kpis: SheetKpi[];
  valueCreation: { lever: string | null; initiative: string; owner: string | null; status: string }[];
  openTasks: SheetEvent[];
  contacts: { name: string; function: string | null; email: string | null; phone: string | null }[];
  editedOn: string;
};

const TASK_DONE = new Set(["Fait", "Terminé", "Terminée", "Annulé", "Annulée"]);
const DD_DONE = new Set(["Conforme", "Fait", "Levé", "Sans objet"]);

export function buildDealSheet(deal: DealDetail, period: string): DealSheet {
  const today = new Date().toISOString().slice(0, 10);

  // Prochaine étape : même logique que la bannière — la tâche ouverte la plus proche.
  const openTasks = deal.tasks
    .filter((t) => !TASK_DONE.has(t.status ?? ""))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const nt = openTasks[0] ?? null;

  // Due diligence agrégée par domaine, et les points encore ouverts.
  const ddByDomain = new Map<string, { total: number; done: number; attention: number }>();
  for (const d of deal.dueDiligence) {
    const dom = d.domain ?? "—";
    if (!ddByDomain.has(dom)) ddByDomain.set(dom, { total: 0, done: 0, attention: 0 });
    const e = ddByDomain.get(dom)!;
    e.total++;
    if (DD_DONE.has(d.status ?? "")) e.done++;
    if (d.status === "Point d'attention") e.attention++;
  }
  const ddOpenPoints: SheetEvent[] = deal.dueDiligence
    .filter((d) => d.status === "Point d'attention")
    .map((d) => ({ date: null, kind: d.domain ?? "—", label: d.item, detail: d.note }));

  const impacts = deal.esg.impacts ?? [];
  const impactScore = impacts.length ? impacts.reduce((s, i) => s + Number(i.score ?? 0), 0) : null;
  const impactMax = impacts.length ? impacts.reduce((s, i) => s + Number(i.maxScore ?? 0), 0) : null;

  const kpis: SheetKpi[] = deal.kpis.map((k) => {
    const upTo = k.series.filter((p) => p.period <= period).sort((a, b) => a.period.localeCompare(b.period));
    const last = upTo[upTo.length - 1] ?? null;
    return { name: k.name, category: k.category, unit: k.unit, value: last?.value ?? null, period: last?.period ?? null };
  });

  return {
    identity: {
      name: deal.companyName,
      sector: deal.sector,
      programs: deal.programs.map((p) => p.name + (p.principal ? " (principal)" : "")),
      stage: deal.stage,
      state: deal.dealState,
      officer: deal.officer,
      analyst: deal.analyst,
      source: deal.source ? (deal.sourceDetail ? `${deal.source} — ${deal.sourceDetail}` : deal.source) : deal.sourceDetail,
    },
    facts: [
      { label: "Montant envisagé", value: deal.amount ? deal.amount.toLocaleString("fr-FR") + " FCFA" : null },
      { label: "Probabilité", value: deal.probability != null ? `${deal.probability} %` : null },
      { label: "Valorisation pré-money", value: deal.valuationPre != null ? deal.valuationPre.toLocaleString("fr-FR") + " FCFA" : null },
      { label: "Part visée", value: deal.ownershipTarget != null ? `${deal.ownershipTarget} %` : null },
      { label: "Closing prévu", value: deal.expectedClose },
    ],
    thesis: deal.thesis,
    nextStep: nt ? { title: nt.title, assignee: nt.assigneeLabel, dueDate: nt.dueDate, late: !!nt.dueDate && nt.dueDate < today } : null,
    committees: deal.committees.map((c) => ({
      date: c.sessionDate,
      kind: c.committeeType,
      label: c.outcome ?? c.decision ?? "—",
      detail: c.conditions,
    })),
    dueDiligence: [...ddByDomain].map(([domain, v]) => ({ domain, ...v })),
    ddOpenPoints,
    esg: {
      riskCategory: deal.esg.assessment?.riskCategory ?? null,
      exclusionOk: deal.esg.assessment?.exclusionOk ?? null,
      impactScore, impactMax,
      actionsTotal: (deal.esg.actions ?? []).length,
      actionsDone: (deal.esg.actions ?? []).filter((a) => a.status === "Réalisée").length,
    },
    kpis,
    valueCreation: deal.valueCreation
      .filter((v) => v.status !== "Réalisée" && v.status !== "Abandonnée")
      .map((v) => ({ lever: v.lever, initiative: v.initiative, owner: v.owner, status: v.status })),
    openTasks: openTasks.map((t) => ({ date: t.dueDate, kind: t.status ?? "À faire", label: t.title, detail: t.assigneeLabel })),
    contacts: deal.contacts.map((c) => ({ name: c.name, function: c.function, email: c.email, phone: c.phone })),
    editedOn: today,
  };
}
