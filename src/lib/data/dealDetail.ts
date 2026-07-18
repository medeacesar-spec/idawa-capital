import { createClient } from "@/lib/supabase/server";
import { getSuivi, type SuiviNote, type SuiviTask } from "./suivi";
import { getEsg, type EsgData } from "./esg";
import { getKpis, getKpiLibraryForEntity, type KpiSeries, type LibraryKpi } from "./kpis";
import { getDdItems, getValueCreation, type DdItem, type ValueInitiative } from "./planning";
import { getFundUsers, type FundUser } from "./users";

export type CommitteeDoc = { id: string; title: string; storagePath: string | null };
export type CommitteePassage = { id: string; committeeType: string; sessionDate: string | null; decision: string | null; conditions: string | null; participants: string | null; outcome: string | null; status: string; validatedBy: string | null; validatedAt: string | null; docs: CommitteeDoc[] };
export type DealContact = { id: string; name: string; function: string | null; email: string | null; phone: string | null; whatsapp: string | null; website: string | null; linkedin: string | null; twitter: string | null; instagram: string | null };
export type DealDoc = { id: string; title: string; category: string | null; storagePath: string | null; createdAt: string | null };

export type DealDetail = {
  id: string;
  companyName: string;
  stage: string;
  status: string | null;
  dealState: string;
  rejectionReason: string | null;
  source: string | null;
  sourceDetail: string | null;
  postMortem: string | null;
  amount: number;
  probability: number | null;
  valuationPre: number | null;
  ownershipTarget: number | null;
  thesis: string | null;
  sector: string | null;
  programName: string | null;
  programColor: string | null;
  officer: string | null;
  analyst: string | null;
  expectedClose: string | null;
  convertedCompanyId: string | null;
  committees: CommitteePassage[];
  contacts: DealContact[];
  documents: DealDoc[];
  notes: SuiviNote[];
  tasks: SuiviTask[];
  esg: EsgData;
  kpis: KpiSeries[];
  kpiLibrary: LibraryKpi[];
  dueDiligence: DdItem[];
  valueCreation: ValueInitiative[];
  users: FundUser[];
};

const dn = (p?: { full_name?: string | null; email?: string | null } | null) => (p ? p.full_name || p.email || null : null);

export async function getDealDetail(id: string): Promise<DealDetail | null> {
  const supabase = await createClient();
  const { data: d } = await supabase
    .from("deals")
    .select("id, company_name, stage, status, deal_state, rejection_reason, deal_source, deal_source_detail, amount, probability, valuation_pre, ownership_target, thesis, program_id, primary_sub_sector_id, investment_officer_id, analyst_id, expected_close, post_mortem")
    .eq("id", id).single();
  if (!d) return null;

  const [progRes, subRes, offRes, anaRes, comRes, contactRes, docRes, convRes] = await Promise.all([
    d.program_id ? supabase.from("programs").select("name, color").eq("id", d.program_id).single() : Promise.resolve({ data: null }),
    d.primary_sub_sector_id ? supabase.from("sub_sectors").select("name").eq("id", d.primary_sub_sector_id).single() : Promise.resolve({ data: null }),
    d.investment_officer_id ? supabase.from("profiles").select("full_name, email").eq("id", d.investment_officer_id).single() : Promise.resolve({ data: null }),
    d.analyst_id ? supabase.from("profiles").select("full_name, email").eq("id", d.analyst_id).single() : Promise.resolve({ data: null }),
    supabase.from("committee_passages").select("id, committee_type, session_date, decision, conditions, participants, outcome, status, validated_by, validated_at").eq("deal_id", id).order("session_date"),
    supabase.from("contacts").select("id, name, function, email, phone, whatsapp, website, linkedin, twitter, instagram").eq("deal_id", id),
    supabase.from("documents").select("id, title, category, storage_path, created_at").eq("deal_id", id),
    supabase.from("portfolio_companies").select("id").eq("origin_deal_id", id).maybeSingle(),
  ]);

  const [suivi, esg, kpis, kpiLibrary, dueDiligence, valueCreation, users] = await Promise.all([getSuivi("deal", id), getEsg("deal", id), getKpis("deal", id), getKpiLibraryForEntity("deal", id), getDdItems("deal", id), getValueCreation("deal", id), getFundUsers()]);

  const comIds = (comRes.data ?? []).map((c) => c.id);
  const { data: comDocs } = comIds.length ? await supabase.from("documents").select("id, title, storage_path, committee_id").in("committee_id", comIds) : { data: [] as { id: string; title: string; storage_path: string | null; committee_id: string }[] };

  const prog = progRes.data as { name?: string; color?: string } | null;
  return {
    id: d.id, companyName: d.company_name, stage: d.stage, status: d.status ?? null,
    dealState: d.deal_state ?? "Actif", rejectionReason: d.rejection_reason ?? null, source: d.deal_source ?? null, sourceDetail: d.deal_source_detail ?? null,
    postMortem: d.post_mortem ?? null, amount: Number(d.amount ?? 0),
    probability: d.probability, valuationPre: d.valuation_pre != null ? Number(d.valuation_pre) : null,
    ownershipTarget: d.ownership_target != null ? Number(d.ownership_target) : null,
    convertedCompanyId: (convRes.data as { id?: string } | null)?.id ?? null,
    thesis: d.thesis,
    sector: (subRes.data as { name?: string } | null)?.name ?? null,
    programName: prog?.name ?? null, programColor: prog?.color ?? null,
    officer: dn(offRes.data as { full_name?: string; email?: string } | null),
    analyst: dn(anaRes.data as { full_name?: string; email?: string } | null),
    expectedClose: d.expected_close,
    committees: (comRes.data ?? []).map((c) => ({ id: c.id, committeeType: c.committee_type, sessionDate: c.session_date, decision: c.decision, conditions: c.conditions, participants: c.participants, outcome: c.outcome ?? null, status: c.status ?? "Proposée", validatedBy: c.validated_by ? (users.find((u) => u.id === c.validated_by)?.name ?? "—") : null, validatedAt: c.validated_at ?? null, docs: (comDocs ?? []).filter((doc) => doc.committee_id === c.id).map((doc) => ({ id: doc.id, title: doc.title, storagePath: doc.storage_path })) })),
    contacts: contactRes.data ?? [],
    documents: (docRes.data ?? []).map((d) => ({ id: d.id, title: d.title, category: d.category, storagePath: d.storage_path, createdAt: d.created_at ?? null })),
    notes: suivi.notes, tasks: suivi.tasks, esg, kpis, kpiLibrary, dueDiligence, valueCreation, users,
  };
}
