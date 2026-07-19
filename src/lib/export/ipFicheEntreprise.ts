// Fiche entreprise au format I&P — génération du classeur « 01. Fiche entreprise_Template [FR] ».
//
// Le modèle d'I&P est un classeur de suivi TRIMESTRIEL : chaque feuille pose des lignes
// d'indicateurs (colonnes A = FLUX ou STOCK, B = famille, C = libellé, D = index) et une
// colonne par fin de trimestre. On reproduit exactement cette ossature et on la remplit
// depuis l'application, pour que le fichier produit se substitue à celui rempli à la main.
//
// Ce qui n'est pas encore collecté reste VIDE, et la feuille « À collecter » dit quoi et
// pourquoi : une case vide sans explication se lit comme un zéro.

import { createClient } from "@/lib/supabase/server";
import type { Sheet, CellValue } from "./xlsx";
import { computeOhada } from "@/lib/finance/ohada";
import { computeSchedule } from "@/lib/finance/amortization";
import { instrumentKind, INSTRUMENT_TYPES } from "@/lib/ui-constants";
import type { Instrument } from "@/lib/data/instruments";

/** Fin du trimestre contenant la date donnée. */
function quarterEnd(year: number, q: number): string {
  return new Date(Date.UTC(year, q * 3, 0)).toISOString().slice(0, 10);
}

/** Les N derniers trimestres, du plus ancien au plus récent. */
export function quarterColumns(endYear: number, endQ: number, count: number): string[] {
  const out: string[] = [];
  let y = endYear;
  let q = endQ;
  for (let i = 0; i < count; i++) {
    out.unshift(quarterEnd(y, q));
    q -= 1;
    if (q === 0) { q = 4; y -= 1; }
  }
  return out;
}

const inQuarter = (iso: string | null, qEnd: string): boolean => {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  const end = new Date(qEnd + "T00:00:00Z");
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 2, 1)).toISOString().slice(0, 10);
  return d >= start && d <= qEnd;
};

/** Une ligne du modèle : nature, famille, libellé, puis une valeur par trimestre. */
type Line = { kind: string; family: string; label: string; values?: (string | number | null)[] };

function sheetFrom(title: string, name: string, quarters: string[], lines: (Line | null)[]): Sheet {
  const rows: CellValue[][] = [];
  rows.push(["PARAMETRES", null, null, 1, ...quarters]);
  rows.push([title, null, null, 2, ...quarters.map((_, i) => i + 1)]);
  rows.push([null, null, null, 3]);
  lines.forEach((l, i) => {
    const d = i + 4;
    if (!l) { rows.push([null, null, null, d]); return; }
    rows.push([l.kind, l.family, l.label, d, ...(l.values ?? quarters.map(() => null))]);
  });
  return { name, rows, widths: [10, 16, 46, 5, ...quarters.map(() => 14)] };
}

export type FicheContext = { companyName: string; quarters: string[] };

export async function buildOneCompany(companyId: string, endYear: number, endQ: number, quarterCount = 12): Promise<{ sheets: Sheet[]; context: FicheContext }> {
  const supabase = await createClient();
  const quarters = quarterColumns(endYear, endQ, quarterCount);

  const [coRes, subRes, instRes, stmtRes, kpiRes, contactRes, capRes] = await Promise.all([
    supabase.from("portfolio_companies").select("*").eq("id", companyId).single(),
    supabase.from("sub_sectors").select("id, name"),
    supabase.from("financing_instruments").select("*").eq("company_id", companyId).order("grant_date"),
    supabase.from("financial_statements").select("fiscal_year, code, amount").eq("company_id", companyId),
    supabase.from("tracked_kpis").select("id, name").eq("entity_type", "company").eq("entity_id", companyId),
    supabase.from("contacts").select("name, function").eq("company_id", companyId),
    supabase.from("company_captable").select("holder, pct").eq("company_id", companyId),
  ]);

  const c = coRes.data as Record<string, unknown> | null;
  if (!c) throw new Error("Société introuvable.");
  const name = String(c.name ?? "");
  const sector = c.primary_sub_sector_id
    ? ((subRes.data ?? []).find((s) => s.id === c.primary_sub_sector_id)?.name ?? null)
    : null;

  const instruments = (instRes.data ?? []) as Record<string, unknown>[];
  const payIds = instruments.map((i) => i.id as string);
  const { data: pays } = payIds.length
    ? await supabase.from("instrument_payments").select("*").in("instrument_id", payIds).order("period_no")
    : { data: [] as Record<string, unknown>[] };

  const toInstrument = (i: Record<string, unknown>): Instrument => ({
    id: i.id as string, type: i.type as string, label: (i.label as string) ?? null, currency: (i.currency as string) ?? null,
    amountCommitted: i.amount_committed != null ? Number(i.amount_committed) : null,
    amountDisbursed: i.amount_disbursed != null ? Number(i.amount_disbursed) : null,
    grantDate: (i.grant_date as string) ?? null,
    ownershipPct: i.ownership_pct != null ? Number(i.ownership_pct) : null,
    valuationMethod: (i.valuation_method as string) ?? null,
    valuation: i.valuation != null ? Number(i.valuation) : null,
    interestRate: i.interest_rate != null ? Number(i.interest_rate) : null,
    variableRate: i.variable_rate != null ? Number(i.variable_rate) : null,
    rateCap: i.rate_cap != null ? Number(i.rate_cap) : null,
    graceMonths: i.grace_months != null ? Number(i.grace_months) : null,
    durationMonths: i.duration_months != null ? Number(i.duration_months) : null,
    periodicity: (i.periodicity as string) ?? null,
    firstDueDate: (i.first_due_date as string) ?? null,
    notes: (i.notes as string) ?? null,
    payments: (pays ?? []).filter((p) => p.instrument_id === i.id).map((p) => ({
      id: p.id as string, periodNo: Number(p.period_no), dueDate: (p.due_date as string) ?? null,
      invoiced: p.invoiced != null ? Number(p.invoiced) : null,
      paid: p.paid != null ? Number(p.paid) : null,
      paidDate: (p.paid_date as string) ?? null, note: (p.note as string) ?? null,
    })),
  });

  const equityInst = instruments.filter((i) => instrumentKind(String(i.type)) === "equity").map(toInstrument);
  const loans = instruments.filter((i) => instrumentKind(String(i.type)) === "debt").map(toInstrument);

  // ---- Données figées : l'en-tête du modèle, une ligne par champ.
  const promoter = (contactRes.data ?? []).find((x) => /pdg|dg|g[ée]rant|promot|dirige/i.test(String(x.function ?? "")))?.name
    ?? (contactRes.data ?? [])[0]?.name ?? null;

  const figees: CellValue[][] = [
    ["Investissement", null],
    ["Nom de l'entreprise", name],
    ["Promoteur", promoter],
    ["Année création", c.founded_year != null ? Number(c.founded_year) : null],
    ["Secteur", sector],
    ["Ville", (c.city as string) ?? (c.country as string) ?? null],
    ["Stade de développement", (c.development_stage as string) ?? null],
    ["Année investissement", c.invested_date ? Number(String(c.invested_date).slice(0, 4)) : null],
    ["Méthode de valorisation à l'acquisition", ((c.valuation_methods_entry as string[]) ?? []).join(", ") || null],
    ["Date sortie attendue", (c.exit_year as number) ?? null],
    ["Multiple sortie", c.exit_multiple_target != null ? Number(c.exit_multiple_target) : null],
    ["Scénario sortie", ((c.exit_scenarios as string[]) ?? []).join(", ") || null],
    ["TRI sortie", c.exit_irr_target != null ? Number(c.exit_irr_target) : null],
    [null, null],
  ];
  // Le modèle prévoit quatre prêts, cinq décaissements chacun.
  for (let n = 0; n < 4; n++) {
    const l = loans[n];
    figees.push([`Prêt ${n + 1}`, l ? (INSTRUMENT_TYPES.find((t) => t.key === l.type)?.label ?? l.type) : null]);
    figees.push(["Taux", l?.interestRate ?? null]);
    figees.push(["Taux variable", l?.variableRate ?? null]);
    for (let d = 1; d <= 5; d++) {
      // L'application porte un décaissement global par instrument : le premier est renseigné,
      // les suivants restent vides tant que le détail des tirages n'est pas saisi.
      figees.push([`Décaissement ${d} : montant`, d === 1 ? (l?.amountDisbursed ?? null) : null]);
      figees.push([`Décaissement ${d} : date`, d === 1 ? (l?.grantDate ?? null) : null]);
    }
    figees.push([null, null]);
  }
  figees.push(["Données impact à l'entrée ?", null]);

  // ---- Capital
  const flowAt = (list: Instrument[], q: string, pick: (i: Instrument) => number | null) =>
    list.filter((i) => inQuarter(i.grantDate, q)).reduce((s, i) => s + (pick(i) ?? 0), 0) || null;
  const cumulative = (list: Instrument[], q: string, pick: (i: Instrument) => number | null) =>
    list.filter((i) => (i.grantDate ?? "9999") <= q).reduce((s, i) => s + (pick(i) ?? 0), 0) || null;

  const capital = sheetFrom("EQUITY", "Capital", quarters, [
    { kind: "FLUX", family: "Realise", label: "Engagement", values: quarters.map((q) => flowAt(equityInst, q, (i) => i.amountCommitted)) },
    { kind: "FLUX", family: "Realise", label: "Décaissements", values: quarters.map((q) => flowAt(equityInst, q, (i) => i.amountDisbursed)) },
    { kind: "FLUX", family: "Realise", label: "Conversion (de prêts, arriérés)" },
    { kind: "FLUX", family: "Realise", label: "Encaissement (remboursement du coût historique)" },
    { kind: "FLUX", family: "Realise", label: "Encaissement (plus ou moins value sur cession)" },
    { kind: "FLUX", family: "Realise", label: "Revalorisations latentes" },
    { kind: "FLUX", family: "Realise", label: "Autres revenus encaissés (dividendes, intérêts)" },
    { kind: "FLUX", family: "Realise", label: "% détention", values: quarters.map((q) => ((c.invested_date as string) ?? "9999") <= q && c.ownership_pct != null ? Number(c.ownership_pct) : null) },
    null, null,
    { kind: "STOCK", family: "Realise", label: "Total engagé", values: quarters.map((q) => cumulative(equityInst, q, (i) => i.amountCommitted)) },
    { kind: "STOCK", family: "Realise", label: "Coût historique", values: quarters.map((q) => cumulative(equityInst, q, (i) => i.amountDisbursed)) },
    { kind: "STOCK", family: "Realise", label: "Valorisation", values: quarters.map((q) => (((c.invested_date as string) ?? "9999") <= q && c.current_valuation != null ? Number(c.current_valuation) : null)) },
    { kind: "STOCK", family: "Realise", label: "Total décaissé", values: quarters.map((q) => cumulative(equityInst, q, (i) => i.amountDisbursed)) },
    { kind: "STOCK", family: "Realise", label: "Total remboursements capital" },
    { kind: "STOCK", family: "Realise", label: "Total plus-values encaissées" },
    { kind: "STOCK", family: "Realise", label: "Total Revalorisation" },
    { kind: "STOCK", family: "Realise", label: "Total Autres revenus encaissés" },
  ]);

  // ---- Prêts : un bloc par prêt, l'échéancier réel confronté au prévisionnel.
  const pretRows: CellValue[][] = [];
  pretRows.push(["PARAMETRES", null, null, 1, ...quarters]);
  pretRows.push(["PRET", null, null, 2, ...quarters.map((_, i) => i + 1)]);
  let d = 3;
  if (!loans.length) pretRows.push([null, null, "Aucun prêt sur cette société", d]);
  for (const [n, loan] of loans.entries()) {
    const sched = computeSchedule(loan);
    const rowsOf = sched?.rows ?? [];
    const sumIn = (q: string, pick: (r: (typeof rowsOf)[number]) => number) =>
      rowsOf.filter((r) => inQuarter(r.date, q)).reduce((s, r) => s + pick(r), 0) || null;
    const upTo = (q: string, pick: (r: (typeof rowsOf)[number]) => number) =>
      rowsOf.filter((r) => (r.date ?? "9999") <= q).reduce((s, r) => s + pick(r), 0) || null;

    pretRows.push([null, null, `— Prêt ${n + 1} : ${loan.label ?? loan.type} —`, ++d]);
    pretRows.push(["FLUX", "Realise", "Engagement", ++d, ...quarters.map((q) => (inQuarter(loan.grantDate, q) ? loan.amountCommitted : null))]);
    pretRows.push(["FLUX", "Realise", "Décaissements", ++d, ...quarters.map((q) => (inQuarter(loan.grantDate, q) ? loan.amountDisbursed : null))]);
    pretRows.push(["FLUX", "Theorique", "Principal remboursé - facturé / prévisions", ++d, ...quarters.map((q) => sumIn(q, (r) => r.principal))]);
    pretRows.push(["FLUX", "Realise", "Principal remboursé - encaissé", ++d, ...quarters.map((q) => sumIn(q, (r) => (r.actual ? Math.max(0, r.paid - r.interest) : 0)))]);
    pretRows.push(["FLUX", "Theorique", "Intérêts - facturé / prévisions", ++d, ...quarters.map((q) => sumIn(q, (r) => r.interest))]);
    pretRows.push(["FLUX", "Realise", "Intérêts - encaissé", ++d, ...quarters.map((q) => sumIn(q, (r) => (r.actual ? Math.min(r.paid, r.interest) : 0)))]);
    pretRows.push(["STOCK", "Realise", "Total engagé", ++d, ...quarters.map((q) => ((loan.grantDate ?? "9999") <= q ? loan.amountCommitted : null))]);
    pretRows.push(["STOCK", "Realise", "Total décaissé", ++d, ...quarters.map((q) => ((loan.grantDate ?? "9999") <= q ? loan.amountDisbursed : null))]);
    pretRows.push(["STOCK", "Realise", "Total reboursements", ++d, ...quarters.map((q) => upTo(q, (r) => (r.actual ? Math.max(0, r.paid - r.interest) : 0)))]);
    pretRows.push(["STOCK", "Realise", "Total intérêts", ++d, ...quarters.map((q) => upTo(q, (r) => (r.actual ? Math.min(r.paid, r.interest) : 0)))]);
    pretRows.push(["STOCK", "Realise", "Encours - cash", ++d, ...quarters.map((q) => {
      const last = [...rowsOf].filter((r) => (r.date ?? "9999") <= q).pop();
      return last ? Math.round(last.balance) : null;
    })]);
    pretRows.push([null, null, null, ++d]);
  }
  const pret: Sheet = { name: "Pret", rows: pretRows, widths: [10, 16, 46, 5, ...quarters.map(() => 14)] };

  // ---- Performance : les états financiers sont ANNUELS, posés sur le trimestre de clôture.
  const byYear = new Map<number, Record<string, number>>();
  for (const s of stmtRes.data ?? []) {
    const y = Number(s.fiscal_year);
    if (!byYear.has(y)) byYear.set(y, {});
    if (s.amount != null) byYear.get(y)![s.code as string] = Number(s.amount);
  }
  const computed = new Map<number, Record<string, number>>();
  for (const [y, raw] of byYear) computed.set(y, computeOhada(raw));

  const atYearClose = (code: string) => quarters.map((q) => {
    if (!q.endsWith("-12-31")) return null;
    const v = computed.get(Number(q.slice(0, 4)));
    const x = v?.[code];
    return x == null || x === 0 ? null : x;
  });

  const performance = sheetFrom("PERFORMANCE", "Performance", quarters, [
    { kind: "STOCK", family: "P&L", label: "CA", values: atYearClose("XB") },
    { kind: "STOCK", family: "P&L", label: "Marge brute", values: atYearClose("XA") },
    { kind: "STOCK", family: "P&L", label: "EBE", values: atYearClose("XD") },
    { kind: "STOCK", family: "P&L", label: "RN", values: atYearClose("XI") },
    null, null,
    { kind: "STOCK", family: "Actif", label: "Immobilisations", values: atYearClose("AZ") },
    { kind: "STOCK", family: "Actif", label: "Actif circulant", values: atYearClose("BK") },
    { kind: "STOCK", family: "Actif", label: "Trésorerie", values: atYearClose("BT") },
    null,
    { kind: "STOCK", family: "Passif", label: "Fonds propres", values: atYearClose("CP") },
    { kind: "STOCK", family: "Passif", label: "Dettes long terme", values: atYearClose("DD") },
    { kind: "STOCK", family: "Passif", label: "Dettes court terme", values: atYearClose("DP") },
    null, null,
    { kind: "STOCK", family: "Notes internes", label: "Performance Financière" },
    { kind: "STOCK", family: "Notes internes", label: "Performance Organisationelle" },
  ]);

  // ---- Impact : seul l'effectif total est suivi aujourd'hui.
  const headKpi = (kpiRes.data ?? []).find((k) => /^effectif/i.test(String(k.name)));
  const { data: headVals } = headKpi
    ? await supabase.from("kpi_values").select("period, value").eq("tracked_kpi_id", headKpi.id)
    : { data: [] as { period: string; value: number }[] };
  const headAt = (q: string): number | null => {
    const y = q.slice(0, 4);
    const qn = Math.ceil(Number(q.slice(5, 7)) / 3);
    const exact = (headVals ?? []).find((v) => String(v.period) === `${y}-T${qn}`);
    if (exact?.value != null) return Number(exact.value);
    // Repli sur la valeur annuelle, posée sur la clôture.
    if (q.endsWith("-12-31")) {
      const annual = (headVals ?? []).find((v) => String(v.period) === y);
      if (annual?.value != null) return Number(annual.value);
    }
    return null;
  };

  const impactLines: (Line | null)[] = [
    { kind: "", family: "Employés", label: "Emplois formels temps plein Hommes" },
    { kind: "", family: "Employés", label: "Emplois formels temps partiel Hommes" },
    { kind: "", family: "Employés", label: "Emplois informels temps plein Hommes" },
    { kind: "", family: "Employés", label: "Emplois informels temps partiel Hommes" },
    { kind: "", family: "Employés", label: "Emplois formels temps plein Femmes" },
    { kind: "", family: "Employés", label: "Emplois formels temps partiel Femmes" },
    { kind: "", family: "Employés", label: "Emplois informels temps plein Femmes" },
    { kind: "", family: "Employés", label: "Emplois informels temps partiel Femmes" },
    { kind: "", family: "Employés", label: "Emplois saisonniers" },
    { kind: "", family: "Employés", label: "Nombres emplois", values: quarters.map(headAt) },
    null,
    { kind: "", family: "Formalisation", label: "Employés formalisés" },
    null,
    { kind: "", family: "Turn-over", label: "Employés à temps plein ayant quitté l'entreprise" },
    null,
    { kind: "", family: "Qualification", label: "% d'employés faiblement qualifiés" },
    { kind: "", family: "Qualification", label: "% d'employés moyennement qualifiés" },
    { kind: "", family: "Qualification", label: "% d'employés très qualifiés" },
    { kind: "", family: "Qualification", label: "% de femmes parmi les employés très qualifiés" },
    { kind: "", family: "Qualification", label: "% d'employés qui ont moins de 25 ans" },
    null,
    { kind: "", family: "Formation", label: "Nombre d'employés formés" },
    { kind: "", family: "Formation", label: "Coûts formation" },
    null,
    { kind: "", family: "Rémunération", label: "Masse salariale annuelle brute" },
    { kind: "", family: "Rémunération", label: "Salaire net minimum en vigueur dans le pays" },
    { kind: "", family: "Rémunération", label: "Salaire net minimum d'un employé formel" },
    null,
    { kind: "", family: "Sécurité Sociale", label: "Employés affiliés caisse de sécurité sociale" },
    { kind: "", family: "Sécurité Sociale", label: "Employés disposant assurance/mutuelle santé" },
    { kind: "", family: "Sécurité Sociale", label: "Nombre accidents du travail" },
    null,
    { kind: "", family: "Clients Fournisseurs", label: "Quantité achetées" },
    { kind: "", family: "Clients Fournisseurs", label: "Nombre petits fournisseurs" },
    { kind: "", family: "Clients Fournisseurs", label: "Nombre petits distributeurs" },
    { kind: "", family: "Clients Fournisseurs", label: "Nombre clients finaux" },
    { kind: "", family: "Clients Fournisseurs", label: "Nombre bénéficiaires programme accompagnement" },
  ];
  const impact = sheetFrom("IMPACT", "Impact", quarters, impactLines);

  const couts = sheetFrom("COUTS", "Couts suivi", quarters, [
    { kind: "FLUX", family: "Realise", label: "Charges salariales" },
    { kind: "FLUX", family: "Realise", label: "Charges variables" },
    { kind: "FLUX", family: "Realise", label: "Fonctions support" },
    { kind: "FLUX", family: "Realise", label: "Frais generaux" },
    { kind: "FLUX", family: "Realise", label: "Frais due diligence" },
  ]);

  // ---- Cap table, utile au rapport et déjà disponible.
  const capTable: Sheet = {
    name: "Actionnariat",
    widths: [34, 14],
    rows: [["Actionnaire", "%"], ...(capRes.data ?? []).map((r) => [r.holder as string, r.pct != null ? Number(r.pct) : null] as CellValue[])],
  };

  // ---- Ce que le modèle attend et que l'outil ne collecte pas encore.
  const todo: Sheet = {
    name: "À collecter",
    widths: [46, 78],
    rows: [
      ["Rubrique du modèle I&P", "Pourquoi elle est vide"],
      ["Décaissements 2 à 5 par prêt", "L'application porte un montant décaissé global par instrument, pas le détail des tirages."],
      ["Emplois par sexe, statut formel/informel, temps plein/partiel", "Seul l'effectif total est suivi. C'est le questionnaire d'impact annuel qui les collecte."],
      ["Formalisation · Turn-over · Qualification · Formation", "Non collectés."],
      ["Rémunération (masse salariale, salaires minimums)", "Non collectés."],
      ["Sécurité sociale · accidents du travail", "Non collectés."],
      ["Clients, fournisseurs, distributeurs, bénéficiaires", "Non collectés au niveau entreprise."],
      ["Coûts de suivi (salariales, variables, support, généraux, DD)", "Comptabilité analytique du fonds — hors périmètre actuel."],
      ["Conversions, provisions, moins-values sur prêts", "Le moteur d'échéancier ne modélise ni conversion ni provision."],
      ["Performance trimestrielle", "Les états financiers sont annuels : les valeurs sont posées sur le trimestre de clôture."],
    ],
  };

  return {
    sheets: [
      { name: "Donnees figees", rows: figees, widths: [42, 30] },
      capital, pret, performance, impact, couts, capTable, todo,
    ],
    context: { companyName: name, quarters },
  };
}

// ---------------------------------------------------------------------------
// Assemblage : une société, plusieurs, ou tout un portefeuille.

export type FicheSelection =
  | { mode: "societes"; ids: string[] }
  | { mode: "programme"; programId: string }
  | { mode: "portefeuille"; tracking?: "equity" | "accompagnement" };

/** Résout la sélection en liste de sociétés, dans l'ordre alphabétique. */
export async function resolveSelection(sel: FicheSelection): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  let q = supabase.from("portfolio_companies").select("id, name, program_id, tracking_type").order("name");
  if (sel.mode === "programme") q = q.eq("program_id", sel.programId);
  if (sel.mode === "portefeuille" && sel.tracking) q = q.eq("tracking_type", sel.tracking);
  const { data } = await q;
  const rows = (data ?? []) as { id: string; name: string }[];
  if (sel.mode !== "societes") return rows.map((r) => ({ id: r.id, name: r.name }));
  const wanted = new Set(sel.ids);
  return rows.filter((r) => wanted.has(r.id)).map((r) => ({ id: r.id, name: r.name }));
}

/** Au-delà, le classeur devient impraticable et la génération trop longue. */
export const MAX_COMPANIES = 30;

/**
 * Construit le classeur.
 *
 * Une seule société : l'ossature EXACTE du modèle I&P, feuille pour feuille.
 * Plusieurs : les mêmes feuilles, chacune empilant un bloc par société précédé de son
 * nom. Cette forme sert à COMPARER — voir douze sociétés sur une même ligne de CA.
 * Pour le reporting trimestriel du portefeuille, c'est l'archive d'un fichier par
 * société qu'il faut (`buildOneCompany` + `zipFiles`) : le modèle est une fiche par
 * entreprise, et l'exercice couvre tout le portefeuille.
 */
export async function buildIpFicheWorkbook(
  companies: { id: string; name: string }[],
  endYear: number,
  endQ: number,
  quarterCount = 12,
): Promise<{ sheets: Sheet[]; quarters: string[] }> {
  if (!companies.length) throw new Error("Aucune société sélectionnée.");
  if (companies.length > MAX_COMPANIES) throw new Error(`Sélection trop large (${companies.length} sociétés, maximum ${MAX_COMPANIES}).`);

  const quarters = quarterColumns(endYear, endQ, quarterCount);
  const parts: { name: string; sheets: Sheet[] }[] = [];
  // En série : chaque société déclenche plusieurs requêtes, les lancer toutes de front
  // sur un portefeuille entier saturerait la connexion.
  for (const co of companies) {
    const { sheets } = await buildOneCompany(co.id, endYear, endQ, quarterCount);
    parts.push({ name: co.name, sheets });
  }

  if (parts.length === 1) return { sheets: parts[0].sheets, quarters };

  const sheetNames = parts[0].sheets.map((s) => s.name);
  const merged: Sheet[] = [];

  const sommaire: Sheet = {
    name: "Sommaire",
    widths: [34, 22, 60],
    rows: [
      ["Sociétés incluses", "Trimestres", `${quarters[0]} → ${quarters[quarters.length - 1]}`],
      ...companies.map((c) => [c.name, null, null] as CellValue[]),
      [null, null, null],
      ["Lecture", null, "Chaque feuille empile un bloc par société, précédé de son nom."],
      ["Édité le", null, new Date().toLocaleDateString("fr-FR")],
    ],
  };
  merged.push(sommaire);

  for (const name of sheetNames) {
    // La feuille « À collecter » est la même pour toutes : inutile de la répéter.
    if (name === "À collecter") { merged.push(parts[0].sheets.find((s) => s.name === name)!); continue; }
    const rows: CellValue[][] = [];
    let widths: number[] | undefined;
    for (const p of parts) {
      const src = p.sheets.find((s) => s.name === name);
      if (!src) continue;
      widths = widths ?? src.widths;
      rows.push([`■ ${p.name}`, null, null, null]);
      rows.push(...src.rows);
      rows.push([null, null, null, null]);
    }
    merged.push({ name, rows, widths });
  }

  return { sheets: merged, quarters };
}

// ---------------------------------------------------------------------------
// Remplissage du MODÈLE d'origine plutôt que régénération.
//
// buildOneCompany encode dans chaque ligne (élément d'index 3) son numéro de ligne dans
// le modèle : on peut donc viser la cellule exacte, sans dépendre d'une position.

const A1 = "A".charCodeAt(0);
function colLetter(index0: number): string {
  let n = index0 + 1, s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(A1 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
/** Date ISO -> numéro de série Excel, pour que la cellule datée s'affiche en date. */
function excelSerial(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.round((t - EXCEL_EPOCH) / 86_400_000);
}

// La première colonne de valeurs du modèle est E (5e colonne, index 4).
const FIRST_VALUE_COL = 4;
// Feuilles à structure de LIGNES FIXE, où l'index encodé = le numéro de ligne du modèle.
const FIXED_SHEETS = new Set(["Capital", "Performance", "Impact", "Couts suivi"]);

/**
 * Construit les valeurs à injecter dans le modèle, feuille par feuille et cellule par
 * cellule. Les feuilles ajoutées par l'application (Actionnariat, À collecter) et le Prêt
 * — dont la structure du modèle diffère de la nôtre — sont laissées telles quelles.
 */
export async function buildFicheFill(companyId: string, endYear: number, endQ: number, quarterCount = 12) {
  const { sheets, context } = await buildOneCompany(companyId, endYear, endQ, quarterCount);
  const fill: Record<string, Record<string, string | number | null>> = {};

  for (const sheet of sheets) {
    if (sheet.name === "Donnees figees") {
      // Deux colonnes [libellé, valeur] : la valeur va en B, à la ligne de position.
      const cells: Record<string, string | number | null> = {};
      sheet.rows.forEach((row, i) => {
        const v = row[1];
        if (v != null && v !== "") cells[`B${i + 1}`] = v;
      });
      fill[sheet.name] = cells;
      continue;
    }

    if (!FIXED_SHEETS.has(sheet.name)) continue;

    const cells: Record<string, string | number | null> = {};
    for (const row of sheet.rows) {
      const modelRow = Number(row[3]);
      if (!modelRow) continue;
      const values = row.slice(FIRST_VALUE_COL);
      values.forEach((v, k) => {
        if (v == null || v === "") return;
        const ref = `${colLetter(FIRST_VALUE_COL + k)}${modelRow}`;
        // Ligne 1 = dates : converties en série pour rester des dates à l'écran.
        cells[ref] = modelRow === 1 && typeof v === "string" ? (excelSerial(v) ?? v) : v;
      });
    }
    fill[sheet.name] = cells;
  }

  return { fill, context };
}
