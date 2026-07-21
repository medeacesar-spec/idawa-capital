import { createClient } from "@/lib/supabase/server";
import { computeTvpi } from "@/lib/format";
import { getCompanySupport, type CompanySupport } from "@/lib/data/companySupport";
import { getSuivi, type SuiviNote, type SuiviTask } from "./suivi";
import { getEsg, type EsgData } from "./esg";
import { getCompanyFinance, type CompanyFinance } from "./companyFinance";
import { getKpis, getKpiLibraryForEntity, type KpiSeries, type LibraryKpi } from "./kpis";
import { getValueCreation, type ValueInitiative } from "./planning";
import { getInstruments, type Instrument } from "./instruments";
import { getFinancialStatements, type StatementValues } from "./financialStatements";
import { getFundUsers, type FundUser } from "./users";
import type { PromoterEval } from "@/components/shared/PromoterEvalModal";
import type { QData } from "@/lib/impact/questionnaire";

export type { KpiSeries };
export type DetailContact = { id: string; name: string; function: string | null; email: string | null; phone: string | null; whatsapp: string | null; website: string | null; linkedin: string | null; twitter: string | null; instagram: string | null };
export type DetailDoc = { id: string; title: string; category: string | null; storagePath: string | null; createdAt: string | null };
export type OriginDueDiligence = { id: string; domain: string; item: string; status: string | null; note: string | null };
export type OriginCommittee = { id: string; committeeType: string; sessionDate: string | null; decision: string | null; outcome: string | null; conditions: string | null; participants: string | null; status: string; validatedBy: string | null; validatedAt: string | null };
export type CommitteeDocRef = { id: string; title: string; storagePath: string | null };
export type CompanyDecision = { id: string; committeeType: string; sessionDate: string | null; decision: string | null; conditions: string | null; participants: string | null; outcome: string | null; status: string; validatedBy: string | null; validatedAt: string | null; docs: CommitteeDocRef[] };
export type OriginNote = { id: string; type: string | null; noteDate: string | null; summary: string | null };

export type Structuration = {
  ehsSector: string | null;
  valuationMethodsEntry: string[];
  valuationMethodsCurrent: string[];
  exitScenarios: string[];
  exitStrategy: string | null;
  exitMultipleTarget: number | null;
  exitIrrTarget: number | null;
  exitYear: number | null;
};

export type CompanyDetail = {
  id: string;
  name: string;
  sector: string | null;
  status: string;
  trackingType: string;
  invested: number;
  valuation: number;
  tvpi: number | null;
  tri: number | null;
  ownership: number | null;
  investedDate: string | null;
  programName: string | null;
  programColor: string | null;
  /** Programmes de la société : le principal en tête, puis les rattachements simultanés. */
  programs: { id: string; name: string; color: string | null; principal: boolean }[];
  /** Programmes ouverts, pour proposer un rattachement supplémentaire. */
  programOptions: { id: string; name: string; color: string | null }[];
  programId: string | null;
  originDealId: string | null;
  originDealName: string | null;
  /** Canal d'entrée du dossier, repris de l'instruction (lecture seule). */
  originSource: { source: string | null; detail: string | null };
  /** Rationnel / thèse d'investissement, repris du dossier. */
  originThesis: string | null;
  /** Parcours en comité de l'instruction (lecture seule), distinct des décisions post-investissement. */
  originCommittees: OriginCommittee[];
  originDueDiligence: OriginDueDiligence[];
  decisions: CompanyDecision[];
  originNotes: OriginNote[];
  notes: SuiviNote[];
  tasks: SuiviTask[];
  /** Présentation : le profil (description éditable), le rationnel repris du dossier, le promoteur. */
  presentation: { description: string | null; originThesis: string | null; promoter: string | null;
    foundedYear: number | null; city: string | null; developmentStage: string | null;
    promoterData: {
      name: string | null; bio: string | null; diploma: string | null;
      age: number | null; gender: string | null; evaluation: PromoterEval | null;
    } };
  /** Bilan de sortie : pendant du post-mortem, sur une société sortie ou radiée. */
  exitReview: string | null;
  /** Dernier questionnaire d'impact rempli par l'entrepreneur (chiffres pour la fiche). */
  impactQuestionnaire: { year: number; status: string; data: QData } | null;
  esg: EsgData;
  finance: CompanyFinance;
  support: CompanySupport;
  valueCreation: ValueInitiative[];
  instruments: Instrument[];
  statements: StatementValues;
  structuration: Structuration;
  kpis: KpiSeries[];
  kpiLibrary: LibraryKpi[];
  users: FundUser[];
  contacts: DetailContact[];
  documents: DetailDoc[];
};

export async function getCompanyDetail(id: string): Promise<CompanyDetail | null> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("portfolio_companies")
    .select("id, name, description, founded_year, city, development_stage, promoter_name, promoter_bio, promoter_diploma, promoter_age, promoter_gender, promoter_eval, exit_review, status, tracking_type, invested_amount, current_valuation, tvpi, tri, ownership_pct, invested_date, program_id, primary_sub_sector_id, origin_deal_id, ehs_sector, valuation_methods_entry, valuation_methods_current, exit_scenarios, exit_strategy, exit_multiple_target, exit_irr_target, exit_year")
    .eq("id", id).single();
  if (!c) return null;

  const [progRes, subRes, dealRes, contactRes, docRes] = await Promise.all([
    c.program_id ? supabase.from("programs").select("name, color").eq("id", c.program_id).single() : Promise.resolve({ data: null }),
    c.primary_sub_sector_id ? supabase.from("sub_sectors").select("name").eq("id", c.primary_sub_sector_id).single() : Promise.resolve({ data: null }),
    c.origin_deal_id ? supabase.from("deals").select("company_name, thesis, deal_source, deal_source_detail").eq("id", c.origin_deal_id).single() : Promise.resolve({ data: null }),
    supabase.from("contacts").select("id, name, function, email, phone, whatsapp, website, linkedin, twitter, instagram").eq("company_id", id),
    supabase.from("documents").select("id, title, category, storage_path, created_at").eq("company_id", id),
  ]);

  const [ddRes, onRes, ocRes, qRes] = await Promise.all([
    // Due diligence réalisée pendant l'instruction : lue EN TRANSPARENCE depuis le dossier
    // d'origine (le dossier reste intact, on ne duplique pas). Affichée en lecture seule.
    c.origin_deal_id ? supabase.from("dd_items").select("id, domain, item, status, note").eq("entity_type", "deal").eq("entity_id", c.origin_deal_id).order("domain") : Promise.resolve({ data: [] }),
    c.origin_deal_id ? supabase.from("notes").select("id, type, note_date, summary").eq("entity_type", "deal").eq("entity_id", c.origin_deal_id).order("note_date", { ascending: false }) : Promise.resolve({ data: [] }),
    // Parcours en COMITÉ pendant l'instruction (la décision d'entrée) : lu depuis le dossier,
    // affiché en lecture seule dans « Origine / instruction ». À distinguer des décisions
    // post-investissement de l'onglet « Décisions ».
    c.origin_deal_id ? supabase.from("committee_passages").select("id, committee_type, session_date, decision, outcome, conditions, participants, status, validated_by, validated_at").eq("deal_id", c.origin_deal_id).order("session_date") : Promise.resolve({ data: [] }),
    // Dernier questionnaire d'impact rempli par l'entrepreneur (validé de préférence, sinon reçu).
    supabase.from("impact_questionnaires").select("year, status, data").eq("entity_type", "company").eq("entity_id", id).in("status", ["Reçu", "Validé"]).order("year", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const [suivi, esg, finance, kpis, kpiLibrary, valueCreation, instruments, statements, users, support] = await Promise.all([getSuivi("company", id), getEsg("company", id), getCompanyFinance(id), getKpis("company", id), getKpiLibraryForEntity("company", id), getValueCreation("company", id), getInstruments(id), getFinancialStatements(id), getFundUsers(), getCompanySupport(id)]);

  // Décisions de comité prises sur la société APRÈS l'investissement (sortie, radiation,
  // mise sous surveillance…). Les passages d'INSTRUCTION portent un deal_id ; on les EXCLUT
  // ici (`deal_id is null`) — ils sont montrés dans l'onglet « Origine / instruction ».
  const { data: decRows } = await supabase.from("committee_passages")
    .select("id, committee_type, session_date, decision, conditions, participants, outcome, status, validated_by, validated_at")
    .eq("company_id", id).is("deal_id", null).order("session_date");
  const decIds = (decRows ?? []).map((d) => d.id);
  const { data: decDocs } = decIds.length
    ? await supabase.from("documents").select("id, title, storage_path, committee_id").in("committee_id", decIds)
    : { data: [] as { id: string; title: string; storage_path: string | null; committee_id: string }[] };
  const decisions: CompanyDecision[] = (decRows ?? []).map((d) => ({
    id: d.id, committeeType: d.committee_type, sessionDate: d.session_date, decision: d.decision, conditions: d.conditions,
    participants: d.participants, outcome: d.outcome ?? null, status: d.status ?? "Proposée",
    validatedBy: d.validated_by ? (users.find((u) => u.id === d.validated_by)?.name ?? "—") : null,
    validatedAt: d.validated_at ?? null,
    docs: (decDocs ?? []).filter((x) => x.committee_id === d.id).map((x) => ({ id: x.id, title: x.title, storagePath: x.storage_path })),
  }));

  const prog = progRes.data as { name?: string; color?: string } | null;

  // Rattachements en cours, principal compris : une société peut relever de plusieurs
  // programmes à la fois, et les afficher tous évite de croire qu'elle n'en a qu'un.
  const [{ data: memRows }, { data: allProgs }] = await Promise.all([
    supabase.from("program_memberships").select("program_id").eq("entity_type", "company").eq("entity_id", id).is("date_end", null),
    supabase.from("programs").select("id, name, color, status, position").order("position"),
  ]);
  const progById = new Map((allProgs ?? []).map((p) => [p.id as string, p]));
  const ids = Array.from(new Set([
    ...(c.program_id ? [c.program_id as string] : []),
    ...(memRows ?? []).map((m) => m.program_id as string).filter(Boolean),
  ]));
  const programs = ids.map((pid) => {
    const p = progById.get(pid);
    return { id: pid, name: (p?.name as string) ?? "—", color: (p?.color as string) ?? null, principal: pid === c.program_id };
  });
  return {
    id: c.id, name: c.name, sector: (subRes.data as { name?: string } | null)?.name ?? null,
    status: c.status, trackingType: c.tracking_type ?? "equity",
    invested: Number(c.invested_amount ?? 0), valuation: Number(c.current_valuation ?? 0),
    tvpi: computeTvpi(Number(c.invested_amount ?? 0), Number(c.current_valuation ?? 0), 0, c.tvpi != null ? Number(c.tvpi) : null), tri: c.tri != null ? Number(c.tri) : null,
    ownership: c.ownership_pct != null ? Number(c.ownership_pct) : null,
    investedDate: c.invested_date, programName: prog?.name ?? null, programColor: prog?.color ?? null,
    programs,
    programOptions: (allProgs ?? [])
      .filter((p) => (p as { status?: string }).status !== "Clos")
      .map((p) => ({ id: p.id as string, name: p.name as string, color: (p.color as string) ?? null })),
    programId: c.program_id ?? null,
    originDealId: c.origin_deal_id ?? null,
    originDealName: (dealRes.data as { company_name?: string } | null)?.company_name ?? null,
    originSource: {
      source: (dealRes.data as { deal_source?: string } | null)?.deal_source ?? null,
      detail: (dealRes.data as { deal_source_detail?: string } | null)?.deal_source_detail ?? null,
    },
    originThesis: (dealRes.data as { thesis?: string } | null)?.thesis ?? null,
    originCommittees: (ocRes.data ?? []).map((x) => ({
      id: x.id, committeeType: x.committee_type, sessionDate: x.session_date, decision: x.decision,
      outcome: x.outcome ?? null, conditions: x.conditions, participants: x.participants, status: x.status ?? "Proposée",
      validatedBy: x.validated_by ? (users.find((u) => u.id === x.validated_by)?.name ?? "—") : null,
      validatedAt: x.validated_at ?? null,
    })),
    originDueDiligence: (ddRes.data ?? []).map((x) => ({ id: x.id, domain: x.domain, item: x.item, status: x.status ?? null, note: x.note ?? null })),
    decisions,
    originNotes: (onRes.data ?? []).map((x) => ({ id: x.id, type: x.type, noteDate: x.note_date, summary: x.summary })),
    notes: suivi.notes, tasks: suivi.tasks,
    presentation: {
      description: (c.description as string) ?? null,
      originThesis: (dealRes.data as { thesis?: string } | null)?.thesis ?? null,
      // Le promoteur : le contact dont la fonction évoque la direction.
      promoter: (contactRes.data ?? []).find((x) => /pdg|dg|g[ée]rant|promot|dirige|fondat/i.test(String(x.function ?? "")))?.name
        ?? (contactRes.data ?? [])[0]?.name ?? null,
      foundedYear: c.founded_year != null ? Number(c.founded_year) : null,
      city: (c.city as string) ?? null,
      developmentStage: (c.development_stage as string) ?? null,
      promoterData: {
        name: (c.promoter_name as string) ?? null, bio: (c.promoter_bio as string) ?? null,
        diploma: (c.promoter_diploma as string) ?? null, age: c.promoter_age != null ? Number(c.promoter_age) : null,
        gender: (c.promoter_gender as string) ?? null, evaluation: c.promoter_eval ?? null,
      },
    },
    exitReview: (c.exit_review as string) ?? null,
    impactQuestionnaire: qRes.data ? { year: (qRes.data as { year: number }).year, status: (qRes.data as { status: string }).status, data: ((qRes.data as { data: QData }).data ?? {}) } : null,
    esg, finance, valueCreation, instruments, statements, support,
    structuration: {
      ehsSector: c.ehs_sector ?? null,
      valuationMethodsEntry: (c.valuation_methods_entry as string[] | null) ?? [],
      valuationMethodsCurrent: (c.valuation_methods_current as string[] | null) ?? [],
      exitScenarios: (c.exit_scenarios as string[] | null) ?? [],
      exitStrategy: c.exit_strategy ?? null,
      exitMultipleTarget: c.exit_multiple_target != null ? Number(c.exit_multiple_target) : null,
      exitIrrTarget: c.exit_irr_target != null ? Number(c.exit_irr_target) : null,
      exitYear: c.exit_year ?? null,
    },
    kpis, kpiLibrary, users, contacts: contactRes.data ?? [],
    documents: (docRes.data ?? []).map((d) => ({ id: d.id, title: d.title, category: d.category, storagePath: d.storage_path, createdAt: d.created_at ?? null })),
  };
}
