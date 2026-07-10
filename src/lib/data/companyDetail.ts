import { createClient } from "@/lib/supabase/server";
import { getSuivi, type SuiviNote, type SuiviTask } from "./suivi";
import { getEsg, type EsgData } from "./esg";
import { getCompanyFinance, type CompanyFinance } from "./companyFinance";
import { getKpis, type KpiSeries } from "./kpis";

export type { KpiSeries };
export type DetailContact = { id: string; name: string; function: string | null; email: string | null };
export type DetailDoc = { id: string; title: string; category: string | null };
export type OriginCommittee = { id: string; committeeType: string; sessionDate: string | null; decision: string | null; conditions: string | null };
export type OriginNote = { id: string; type: string | null; noteDate: string | null; summary: string | null };

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
  originDealId: string | null;
  originDealName: string | null;
  originCommittees: OriginCommittee[];
  originNotes: OriginNote[];
  notes: SuiviNote[];
  tasks: SuiviTask[];
  esg: EsgData;
  finance: CompanyFinance;
  kpis: KpiSeries[];
  contacts: DetailContact[];
  documents: DetailDoc[];
};

export async function getCompanyDetail(id: string): Promise<CompanyDetail | null> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("portfolio_companies")
    .select("id, name, status, tracking_type, invested_amount, current_valuation, tvpi, tri, ownership_pct, invested_date, program_id, primary_sub_sector_id, origin_deal_id")
    .eq("id", id).single();
  if (!c) return null;

  const [progRes, subRes, dealRes, contactRes, docRes] = await Promise.all([
    c.program_id ? supabase.from("programs").select("name, color").eq("id", c.program_id).single() : Promise.resolve({ data: null }),
    c.primary_sub_sector_id ? supabase.from("sub_sectors").select("name").eq("id", c.primary_sub_sector_id).single() : Promise.resolve({ data: null }),
    c.origin_deal_id ? supabase.from("deals").select("company_name").eq("id", c.origin_deal_id).single() : Promise.resolve({ data: null }),
    supabase.from("contacts").select("id, name, function, email").eq("company_id", id),
    supabase.from("documents").select("id, title, category").eq("company_id", id),
  ]);

  const [ocRes, onRes] = await Promise.all([
    c.origin_deal_id ? supabase.from("committee_passages").select("id, committee_type, session_date, decision, conditions").eq("deal_id", c.origin_deal_id).order("session_date") : Promise.resolve({ data: [] }),
    c.origin_deal_id ? supabase.from("notes").select("id, type, note_date, summary").eq("entity_type", "deal").eq("entity_id", c.origin_deal_id).order("note_date", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const [suivi, esg, finance, kpis] = await Promise.all([getSuivi("company", id), getEsg("company", id), getCompanyFinance(id), getKpis("company", id)]);

  const prog = progRes.data as { name?: string; color?: string } | null;
  return {
    id: c.id, name: c.name, sector: (subRes.data as { name?: string } | null)?.name ?? null,
    status: c.status, trackingType: c.tracking_type ?? "equity",
    invested: Number(c.invested_amount ?? 0), valuation: Number(c.current_valuation ?? 0),
    tvpi: c.tvpi != null ? Number(c.tvpi) : null, tri: c.tri != null ? Number(c.tri) : null,
    ownership: c.ownership_pct != null ? Number(c.ownership_pct) : null,
    investedDate: c.invested_date, programName: prog?.name ?? null, programColor: prog?.color ?? null,
    originDealId: c.origin_deal_id ?? null,
    originDealName: (dealRes.data as { company_name?: string } | null)?.company_name ?? null,
    originCommittees: (ocRes.data ?? []).map((x) => ({ id: x.id, committeeType: x.committee_type, sessionDate: x.session_date, decision: x.decision, conditions: x.conditions })),
    originNotes: (onRes.data ?? []).map((x) => ({ id: x.id, type: x.type, noteDate: x.note_date, summary: x.summary })),
    notes: suivi.notes, tasks: suivi.tasks, esg, finance,
    kpis, contacts: contactRes.data ?? [], documents: docRes.data ?? [],
  };
}
