// Catalogue d'extraction — tout ce que l'outil contient, exportable à la carte.
//
// L'extraction ne proposait que trois tableaux en CSV sur une seule période, alors que
// l'application porte désormais les états financiers OHADA, les échéanciers, les comités,
// l'ESG, l'accélération et le suivi. On ouvre donc un catalogue : on coche les jeux
// voulus, ils arrivent dans UN SEUL classeur, une feuille par jeu.
//
// Un filtre commun s'applique à tout ce qui se rattache à une société (programme, type
// de suivi, sélection nominative) et une plage de périodes à tout ce qui est daté.
// Un jeu vide sort quand même, avec ses en-têtes : une feuille absente ferait croire à
// un oubli, une feuille vide dit qu'il n'y a rien.

import { createClient } from "@/lib/supabase/server";
import { computeOhada } from "@/lib/finance/ohada";
import { computeRatios, bilanFonctionnelComplet, soldesDeGestion, variation, SECTOR_RATIOS_PENDING } from "@/lib/finance/analysis";
import type { Sheet, CellValue } from "./xlsx";

export type ExtractionScope = {
  /** Sociétés retenues ; vide = toutes. */
  companyIds?: string[];
  programId?: string;
  tracking?: "equity" | "accompagnement";
  /** Bornes de période, au format « 2024 » ou « 2024-T2 ». */
  from?: string;
  to?: string;
};

export type ExtractionSet = {
  key: string;
  label: string;
  group: string;
  hint: string;
};

/** Le catalogue présenté à l'écran. L'ordre est celui de la lecture d'un fonds. */
export const EXTRACTION_SETS: ExtractionSet[] = [
  { key: "portefeuille", group: "Portefeuille", label: "Sociétés", hint: "Une ligne par société : secteur, programme, investi, valorisation, multiple." },
  { key: "instruments", group: "Portefeuille", label: "Instruments de financement", hint: "Capital, quasi-equity et prêts : engagé, décaissé, taux, durée." },
  { key: "echeances", group: "Portefeuille", label: "Échéances et encaissements", hint: "Chaque échéance : facturé, encaissé, date de paiement." },
  { key: "captable", group: "Portefeuille", label: "Actionnariat", hint: "Cap table de chaque société." },
  { key: "flux", group: "Portefeuille", label: "Flux et valorisations", hint: "Appels de fonds, distributions, valorisations arrêtées." },

  { key: "etats", group: "Finances", label: "États financiers OHADA", hint: "Poste par poste, par exercice, avec le code OHADA." },
  { key: "budget", group: "Finances", label: "Budget & business plan", hint: "Budget et réalisé par poste et par exercice." },
  { key: "analyse", group: "Finances", label: "Analyse financière", hint: "Soldes de gestion, bilan fonctionnel, CAF et ratios avec leur norme — au format du modèle d'analyse." },

  { key: "kpis", group: "Suivi", label: "Indicateurs suivis", hint: "Toutes les valeurs de KPI, par période — pas une seule période." },
  { key: "taches", group: "Suivi", label: "Tâches", hint: "Actions ouvertes et closes, responsable, échéance." },
  { key: "notes", group: "Suivi", label: "Comptes rendus", hint: "Réunions, appels et notes datées." },
  { key: "comites", group: "Suivi", label: "Comités et décisions", hint: "Passages en comité, décision, issue, validation." },

  { key: "esg_diag", group: "ESG & impact", label: "Diagnostics E&S", hint: "Catégorie de risque, secteur EHS, liste d'exclusion." },
  { key: "esg_actions", group: "ESG & impact", label: "Plans d'action E&S", hint: "Actions, domaine, responsable, échéance, statut." },
  { key: "esg_impact", group: "ESG & impact", label: "Notation d'impact IPDEV2", hint: "Score par dimension et bonus." },

  { key: "accompagnement", group: "Accélération", label: "Indicateurs par entreprise", hint: "Valeurs saisies entreprise par entreprise et par trimestre." },
  { key: "programme_ind", group: "Accélération", label: "Indicateurs de programme", hint: "Valeurs consolidées au niveau du programme." },

  { key: "dd", group: "Instruction", label: "Due diligence", hint: "Points de contrôle par domaine et leur statut." },
  { key: "valeur", group: "Instruction", label: "Création de valeur", hint: "Initiatives, levier, responsable, échéance." },
  { key: "pipeline", group: "Instruction", label: "Dossiers du pipeline", hint: "Étape, montant, source, probabilité." },

  { key: "contacts", group: "Référentiel", label: "Contacts", hint: "Répertoire, avec l'entité rattachée." },
  { key: "documents", group: "Référentiel", label: "Documents", hint: "Titre, catégorie, rattachement, date de dépôt." },
  { key: "programmes", group: "Référentiel", label: "Programmes", hint: "Nature, statut, secteur EHS." },
];

const num = (v: unknown) => (v == null ? null : Number(v));
const day = (v: unknown) => (v == null ? null : String(v).slice(0, 10));

/** Une période « 2025-T2 » ou « 2025 » tombe-t-elle dans la plage demandée ? */
function inRange(period: unknown, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const p = String(period ?? "");
  if (!p) return false;
  if (from && p < from) return false;
  // « 2025 » doit rester inclus quand la borne haute est « 2025-T4 ».
  if (to && p.slice(0, to.length) > to) return false;
  return true;
}

function yearInRange(year: unknown, from?: string, to?: string): boolean {
  const y = String(year ?? "");
  if (from && y < from.slice(0, 4)) return false;
  if (to && y > to.slice(0, 4)) return false;
  return true;
}

export async function buildExtraction(keys: string[], scope: ExtractionScope): Promise<Sheet[]> {
  const supabase = await createClient();

  // Le périmètre de sociétés est calculé UNE fois et sert à tous les jeux : c'est ce qui
  // garantit qu'un classeur de plusieurs feuilles parle bien du même sous-ensemble.
  const { data: allCos } = await supabase
    .from("portfolio_companies")
    .select("id, name, status, tracking_type, invested_date, invested_amount, ownership_pct, current_valuation, primary_sub_sector_id, program_id")
    .order("name");

  let companies = allCos ?? [];
  if (scope.programId) companies = companies.filter((c) => c.program_id === scope.programId);
  if (scope.tracking) companies = companies.filter((c) => (c.tracking_type ?? "equity") === scope.tracking);
  if (scope.companyIds?.length) {
    const want = new Set(scope.companyIds);
    companies = companies.filter((c) => want.has(c.id as string));
  }
  const ids = companies.map((c) => c.id as string);
  const nameOf = new Map(companies.map((c) => [c.id as string, c.name as string]));

  const [{ data: subs }, { data: progs }, { data: profiles }] = await Promise.all([
    supabase.from("sub_sectors").select("id, name"),
    supabase.from("programs").select("id, name, nature, status, ehs_sector"),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const subOf = new Map((subs ?? []).map((s) => [s.id as string, s.name as string]));
  const progOf = new Map((progs ?? []).map((p) => [p.id as string, p.name as string]));
  const userOf = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string) ?? ""]));

  const sheets: Sheet[] = [];
  const add = (name: string, headers: string[], rows: CellValue[][], widths?: number[]) =>
    sheets.push({ name, rows: [headers, ...rows], widths: widths ?? headers.map(() => 20) });

  const wanted = new Set(keys);
  const noCompany = ids.length === 0;

  // --- Portefeuille -------------------------------------------------------
  if (wanted.has("portefeuille")) {
    add("Sociétés",
      ["Société", "Secteur", "Programme", "Suivi", "Statut", "Entrée", "Investi", "Détention %", "Valorisation", "Multiple"],
      companies.map((c) => {
        const inv = Number(c.invested_amount ?? 0);
        const val = Number(c.current_valuation ?? 0);
        return [
          c.name as string,
          c.primary_sub_sector_id ? (subOf.get(c.primary_sub_sector_id as string) ?? null) : null,
          c.program_id ? (progOf.get(c.program_id as string) ?? null) : null,
          (c.tracking_type ?? "equity") === "equity" ? "Participation" : "Accélération",
          c.status as string, day(c.invested_date), num(c.invested_amount), num(c.ownership_pct), num(c.current_valuation),
          inv > 0 ? Number((val / inv).toFixed(2)) : null,
        ];
      }), [26, 24, 20, 14, 14, 12, 16, 12, 16, 10]);
  }

  if (wanted.has("instruments") || wanted.has("echeances")) {
    const { data: inst } = noCompany ? { data: [] } : await supabase
      .from("financing_instruments").select("*").in("company_id", ids).order("grant_date");
    const instruments = inst ?? [];

    if (wanted.has("instruments")) {
      add("Instruments",
        ["Société", "Type", "Libellé", "Octroi", "Engagé", "Décaissé", "Taux %", "Durée (mois)", "Différé (mois)", "Périodicité"],
        instruments.map((i) => [
          nameOf.get(i.company_id as string) ?? "—", i.type as string, (i.label as string) ?? null,
          day(i.grant_date), num(i.amount_committed), num(i.amount_disbursed),
          num(i.interest_rate), num(i.duration_months), num(i.grace_months), (i.periodicity as string) ?? null,
        ]), [26, 20, 26, 12, 16, 16, 10, 12, 14, 14]);
    }

    if (wanted.has("echeances")) {
      const instIds = instruments.map((i) => i.id as string);
      const { data: pays } = instIds.length
        ? await supabase.from("instrument_payments").select("*").in("instrument_id", instIds).order("period_no")
        : { data: [] };
      const instOf = new Map(instruments.map((i) => [i.id as string, i]));
      add("Échéances",
        ["Société", "Instrument", "N°", "Échéance", "Facturé", "Encaissé", "Payé le", "Note"],
        (pays ?? []).filter((p) => inRange(String(p.due_date ?? "").slice(0, 4), scope.from, scope.to)).map((p) => {
          const i = instOf.get(p.instrument_id as string);
          return [
            i ? (nameOf.get(i.company_id as string) ?? "—") : "—",
            i ? ((i.label as string) ?? (i.type as string)) : "—",
            num(p.period_no), day(p.due_date), num(p.invoiced), num(p.paid), day(p.paid_date), (p.note as string) ?? null,
          ];
        }), [24, 26, 6, 12, 14, 14, 12, 30]);
    }
  }

  if (wanted.has("captable")) {
    const { data } = noCompany ? { data: [] } : await supabase.from("company_captable").select("*").in("company_id", ids);
    add("Actionnariat", ["Société", "Actionnaire", "Type", "%", "Titres", "Note"],
      (data ?? []).map((r) => [
        nameOf.get(r.company_id as string) ?? "—", r.holder as string, (r.holder_type as string) ?? null,
        num(r.pct), num(r.shares), (r.note as string) ?? null,
      ]), [24, 28, 16, 10, 14, 30]);
  }

  if (wanted.has("flux")) {
    const { data } = noCompany ? { data: [] } : await supabase.from("company_flows").select("*").in("company_id", ids).order("flow_date");
    add("Flux et valorisations", ["Société", "Date", "Exercice", "Type", "Montant", "Méthode", "Statut", "Note"],
      (data ?? []).filter((f) => yearInRange(f.fiscal_year ?? String(f.flow_date ?? "").slice(0, 4), scope.from, scope.to)).map((f) => [
        nameOf.get(f.company_id as string) ?? "—", day(f.flow_date), num(f.fiscal_year), f.type as string,
        num(f.amount), (f.method as string) ?? null, (f.status as string) ?? null, (f.note as string) ?? null,
      ]), [24, 12, 10, 18, 16, 22, 12, 30]);
  }

  // --- Finances -----------------------------------------------------------
  if (wanted.has("etats")) {
    const { data } = noCompany ? { data: [] } : await supabase.from("financial_statements").select("*").in("company_id", ids);
    add("États financiers", ["Société", "Exercice", "Code OHADA", "Montant"],
      (data ?? []).filter((r) => yearInRange(r.fiscal_year, scope.from, scope.to))
        .sort((a, b) => String(a.company_id).localeCompare(String(b.company_id)) || Number(a.fiscal_year) - Number(b.fiscal_year))
        .map((r) => [nameOf.get(r.company_id as string) ?? "—", num(r.fiscal_year), r.code as string, num(r.amount)]),
      [26, 10, 12, 18]);
  }

  if (wanted.has("budget")) {
    const { data } = noCompany ? { data: [] } : await supabase.from("company_financials").select("*").in("company_id", ids);
    add("Budget & BP", ["Société", "Exercice", "Poste", "Budget", "Réalisé", "Écart"],
      (data ?? []).filter((r) => inRange(r.period, scope.from, scope.to)).map((r) => {
        const b = num(r.budget), a = num(r.actual);
        return [nameOf.get(r.company_id as string) ?? "—", r.period as string, r.label as string, b, a,
          b != null && a != null ? a - b : null];
      }), [24, 10, 34, 16, 16, 16]);
  }

  if (wanted.has("analyse")) {
    const { data: st } = noCompany ? { data: [] } : await supabase.from("financial_statements").select("*").in("company_id", ids);
    // Un exercice par société, avec les totaux recalculés — jamais ceux qui seraient saisis.
    const byKey = new Map<string, Record<string, number>>();
    for (const r of st ?? []) {
      if (!yearInRange(r.fiscal_year, scope.from, scope.to)) continue;
      const k = `${r.company_id}|${r.fiscal_year}`;
      if (!byKey.has(k)) byKey.set(k, {});
      if (r.amount != null) byKey.get(k)![r.code as string] = Number(r.amount);
    }
    const keys = [...byKey.keys()].sort();
    const computedOf = new Map([...byKey].map(([k, raw]) => [k, computeOhada(raw)]));
    const rows: CellValue[][] = [];

    for (const k of keys) {
      const [cid, year] = k.split("|");
      const v = computedOf.get(k)!;
      const prev = computedOf.get(`${cid}|${Number(year) - 1}`) ?? null;
      const co = nameOf.get(cid) ?? "—";

      for (const l of soldesDeGestion(v)) {
        const p = prev ? (soldesDeGestion(prev).find((x) => x.code === l.code)?.value ?? null) : null;
        rows.push([co, Number(year), "Soldes de gestion", l.label, l.value, l.share ?? null, variation(l.value, p), "", ""]);
      }
      const b = bilanFonctionnelComplet(v);
      for (const l of [...b.actif, ...b.passif]) rows.push([co, Number(year), "Bilan", l.label, l.value, l.share ?? null, null, "", ""]);
      for (const l of b.analyse) {
        const p = prev ? (bilanFonctionnelComplet(prev).analyse.find((x) => x.label === l.label)?.value ?? null) : null;
        rows.push([co, Number(year), "Analyse fonctionnelle", l.label, l.value, null, variation(l.value, p), "", ""]);
      }
      for (const r of computeRatios(v)) {
        rows.push([co, Number(year), r.family, r.label, r.value, null, null, r.norm || null, r.verdict]);
      }
    }

    add("Analyse financière",
      ["Société", "Exercice", "Famille", "Indicateur", "Valeur", "Part", "Variation", "Norme", "Lecture"],
      rows, [24, 10, 22, 40, 18, 10, 12, 16, 14]);

    // Ce que le modèle prévoit pour les banques et les assurances n'est pas calculable
    // depuis le plan OHADA général : on le dit plutôt que de produire des chiffres faux.
    add("Ratios sectoriels à venir", ["Secteur", "Ratio attendu"],
      SECTOR_RATIOS_PENDING.flatMap((s) => s.ratios.map((r) => [s.sector, r] as CellValue[])), [34, 44]);
  }

  // --- Suivi --------------------------------------------------------------
  if (wanted.has("kpis")) {
    const { data: tracked } = await supabase.from("tracked_kpis").select("*");
    const mine = (tracked ?? []).filter((k) => k.entity_type === "company" && ids.includes(k.entity_id as string));
    const kIds = mine.map((k) => k.id as string);
    const { data: vals } = kIds.length
      ? await supabase.from("kpi_values").select("*").in("tracked_kpi_id", kIds)
      : { data: [] };
    const kOf = new Map(mine.map((k) => [k.id as string, k]));
    add("Indicateurs", ["Société", "Famille", "Indicateur", "Unité", "Période", "Valeur", "Cible"],
      (vals ?? []).filter((v) => inRange(v.period, scope.from, scope.to)).map((v) => {
        const k = kOf.get(v.tracked_kpi_id as string);
        return [
          k ? (nameOf.get(k.entity_id as string) ?? "—") : "—",
          (k?.category as string) ?? null, (k?.name as string) ?? "—", (k?.unit as string) ?? null,
          v.period as string, num(v.value), num(k?.target),
        ];
      }), [24, 16, 34, 10, 12, 16, 14]);
  }

  if (wanted.has("taches") || wanted.has("notes") || wanted.has("dd") || wanted.has("valeur")) {
    const entity = (t: unknown, e: unknown) => (t === "company" ? (nameOf.get(String(e)) ?? null) : null);
    const mineOf = <T extends { entity_type?: unknown; entity_id?: unknown }>(rows: T[]) =>
      rows.filter((r) => r.entity_type === "company" && ids.includes(String(r.entity_id)));

    if (wanted.has("taches")) {
      const { data } = await supabase.from("tasks").select("*").order("due_date");
      add("Tâches", ["Société", "Tâche", "Responsable", "Échéance", "Statut"],
        mineOf(data ?? []).map((t) => [
          entity(t.entity_type, t.entity_id), t.title as string,
          (t.assignee_label as string) ?? userOf.get(String(t.assignee_id)) ?? null,
          day(t.due_date), (t.status as string) ?? null,
        ]), [24, 44, 22, 12, 14]);
    }
    if (wanted.has("notes")) {
      const { data } = await supabase.from("notes").select("*").order("note_date", { ascending: false });
      add("Comptes rendus", ["Société", "Date", "Type", "Participants", "Résumé"],
        mineOf(data ?? []).filter((n) => inRange(String(n.note_date ?? "").slice(0, 4), scope.from, scope.to)).map((n) => [
          entity(n.entity_type, n.entity_id), day(n.note_date), (n.type as string) ?? null,
          (n.participants as string) ?? null, (n.summary as string) ?? null,
        ]), [24, 12, 14, 26, 70]);
    }
    if (wanted.has("dd")) {
      const { data } = await supabase.from("dd_items").select("*");
      add("Due diligence", ["Société", "Domaine", "Point de contrôle", "Statut", "Note"],
        mineOf(data ?? []).map((d) => [
          entity(d.entity_type, d.entity_id), (d.domain as string) ?? null, d.item as string,
          (d.status as string) ?? null, (d.note as string) ?? null,
        ]), [24, 24, 44, 18, 40]);
    }
    if (wanted.has("valeur")) {
      const { data } = await supabase.from("value_creation").select("*");
      add("Création de valeur", ["Société", "Levier", "Initiative", "Responsable", "Échéance", "Statut", "Impact"],
        mineOf(data ?? []).map((v) => [
          entity(v.entity_type, v.entity_id), (v.lever as string) ?? null, v.initiative as string,
          (v.owner as string) ?? null, day(v.target_date), (v.status as string) ?? null, (v.impact as string) ?? null,
        ]), [24, 24, 40, 20, 12, 14, 26]);
    }
  }

  if (wanted.has("comites")) {
    const { data } = await supabase.from("committee_passages").select("*").order("session_date");
    add("Comités", ["Société", "Type de comité", "Séance", "Décision", "Issue", "Statut", "Participants", "Conditions"],
      (data ?? []).filter((c) => c.company_id && ids.includes(c.company_id as string))
        .filter((c) => yearInRange(String(c.session_date ?? "").slice(0, 4), scope.from, scope.to))
        .map((c) => [
          nameOf.get(c.company_id as string) ?? "—", c.committee_type as string, day(c.session_date),
          (c.decision as string) ?? null, (c.outcome as string) ?? null, (c.status as string) ?? null,
          (c.participants as string) ?? null, (c.conditions as string) ?? null,
        ]), [24, 28, 12, 24, 24, 12, 26, 50]);
  }

  // --- ESG ----------------------------------------------------------------
  if (wanted.has("esg_diag")) {
    const { data } = await supabase.from("esg_assessments").select("*");
    add("Diagnostics E&S", ["Société", "Catégorie de risque", "Secteur EHS", "Liste d'exclusion"],
      (data ?? []).filter((a) => a.entity_type === "company" && ids.includes(a.entity_id as string)).map((a) => [
        nameOf.get(a.entity_id as string) ?? "—", (a.risk_category as string) ?? null,
        (a.ehs_sector as string) ?? null, a.exclusion_ok == null ? null : a.exclusion_ok ? "Conforme" : "Point d'attention",
      ]), [26, 20, 30, 20]);
  }
  if (wanted.has("esg_actions")) {
    const { data } = await supabase.from("esg_actions").select("*").order("date_end_plan");
    add("Plans d'action E&S", ["Société", "Domaine", "Action", "Responsable", "Échéance", "Statut", "Commentaire"],
      (data ?? []).filter((a) => a.entity_type === "company" && ids.includes(a.entity_id as string)).map((a) => [
        nameOf.get(a.entity_id as string) ?? "—", (a.category as string) ?? null, (a.action as string) ?? null,
        (a.responsible_code as string) ?? userOf.get(String(a.assignee_id)) ?? null,
        day(a.date_end_plan), (a.status as string) ?? null, (a.comment as string) ?? null,
      ]), [24, 12, 46, 18, 12, 16, 36]);
  }
  if (wanted.has("esg_impact")) {
    const { data } = await supabase.from("esg_impact_ratings").select("*");
    add("Notation d'impact", ["Société", "Dimension", "Score", "Maximum"],
      (data ?? []).filter((i) => i.entity_type === "company" && ids.includes(i.entity_id as string)).map((i) => [
        nameOf.get(i.entity_id as string) ?? "—", (i.dimension as string) ?? null, num(i.score), num(i.max_score),
      ]), [26, 22, 10, 10]);
  }

  // --- Accélération -------------------------------------------------------
  if (wanted.has("accompagnement") || wanted.has("programme_ind")) {
    const { data: pis } = await supabase.from("program_indicators").select("*");
    const piOf = new Map((pis ?? []).map((p) => [p.id as string, p]));

    if (wanted.has("accompagnement")) {
      const { data } = noCompany ? { data: [] } : await supabase.from("company_indicator_values").select("*").in("company_id", ids);
      add("Accompagnement", ["Société", "Programme", "Catégorie", "Indicateur", "Unité", "Période", "Valeur"],
        (data ?? []).filter((v) => inRange(v.period, scope.from, scope.to)).map((v) => {
          const p = piOf.get(v.program_indicator_id as string);
          return [
            nameOf.get(v.company_id as string) ?? "—",
            p ? (progOf.get(p.program_id as string) ?? null) : null,
            (p?.category as string) ?? null, (p?.name as string) ?? "—", (p?.unit as string) ?? null,
            v.period as string, num(v.value),
          ];
        }), [24, 22, 18, 34, 10, 12, 14]);
    }
    if (wanted.has("programme_ind")) {
      const { data } = await supabase.from("program_indicator_values").select("*");
      add("Indicateurs programme", ["Programme", "Catégorie", "Indicateur", "Portée", "Unité", "Période", "Valeur", "Cible"],
        (data ?? []).filter((v) => inRange(v.period, scope.from, scope.to)).map((v) => {
          const p = piOf.get(v.program_indicator_id as string);
          return [
            p ? (progOf.get(p.program_id as string) ?? null) : null,
            (p?.category as string) ?? null, (p?.name as string) ?? "—", (p?.scope as string) ?? null,
            (p?.unit as string) ?? null, v.period as string, num(v.value), num(p?.target),
          ];
        }), [22, 18, 34, 14, 10, 12, 14, 12]);
    }
  }

  // --- Instruction --------------------------------------------------------
  if (wanted.has("pipeline")) {
    const { data } = await supabase.from("deals").select("*").order("company_name");
    add("Pipeline", ["Dossier", "Étape", "État", "Montant", "Probabilité %", "Date prévue", "Source", "Précision source"],
      (data ?? []).map((d) => [
        d.company_name as string, d.stage as string, (d.deal_state as string) ?? null, num(d.amount),
        num(d.probability), day(d.expected_close), (d.deal_source as string) ?? null, (d.deal_source_detail as string) ?? null,
      ]), [30, 18, 12, 16, 12, 12, 22, 26]);
  }

  // --- Référentiel --------------------------------------------------------
  if (wanted.has("contacts")) {
    const { data } = await supabase.from("contacts").select("*").order("name");
    add("Contacts", ["Nom", "Fonction", "Organisation", "Type", "Email", "Téléphone", "Société rattachée"],
      (data ?? []).map((c) => [
        c.name as string, (c.function as string) ?? null, (c.organization as string) ?? null, (c.org_type as string) ?? null,
        (c.email as string) ?? null, (c.phone as string) ?? null,
        c.company_id ? (nameOf.get(c.company_id as string) ?? null) : null,
      ]), [26, 24, 26, 16, 30, 18, 24]);
  }
  if (wanted.has("documents")) {
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    add("Documents", ["Titre", "Catégorie", "Société rattachée", "Déposé le"],
      (data ?? []).map((d) => [
        d.title as string, (d.category as string) ?? null,
        d.company_id ? (nameOf.get(d.company_id as string) ?? null) : null, day(d.created_at),
      ]), [46, 22, 24, 12]);
  }
  if (wanted.has("programmes")) {
    add("Programmes", ["Programme", "Nature", "Statut", "Secteur EHS"],
      (progs ?? []).map((p) => [p.name as string, (p.nature as string) ?? null, (p.status as string) ?? null, (p.ehs_sector as string) ?? null]),
      [28, 18, 12, 30]);
  }
  // NB : les Partenaires & LPs ne sont volontairement PAS extractibles ici — donnée
  // sensible (relation investisseurs / bailleurs), réservée à l'écran Partenaires.

  // Feuille de tête : ce que contient le classeur et sur quel périmètre.
  const scopeLabel = scope.companyIds?.length ? `${companies.length} société(s) choisie(s)`
    : scope.programId ? `Programme : ${progOf.get(scope.programId) ?? "—"}`
    : scope.tracking ? (scope.tracking === "equity" ? "Participations" : "Accélération")
    : "Tout le portefeuille";

  sheets.unshift({
    name: "Périmètre",
    widths: [30, 60],
    rows: [
      ["Extraction", "Idawa Capital"],
      ["Périmètre", scopeLabel],
      ["Sociétés concernées", companies.length],
      ["Périodes", scope.from || scope.to ? `${scope.from ?? "origine"} → ${scope.to ?? "aujourd'hui"}` : "toutes"],
      ["Jeux extraits", sheets.map((s) => s.name).join(" · ")],
      ["Édité le", new Date().toLocaleDateString("fr-FR")],
      [null, null],
      ["Lecture", "Une feuille par jeu. Une feuille vide signifie qu'il n'y a rien à extraire sur ce périmètre, pas un oubli."],
    ],
  });

  return sheets;
}
