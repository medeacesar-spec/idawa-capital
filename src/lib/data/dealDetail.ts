import { createClient } from "@/lib/supabase/server";

export type CommitteePassage = { id: string; committeeType: string; sessionDate: string | null; decision: string | null; conditions: string | null; participants: string | null };
export type DealContact = { id: string; name: string; function: string | null; email: string | null };
export type DealDoc = { id: string; title: string; category: string | null };

export type DealDetail = {
  id: string;
  companyName: string;
  stage: string;
  amount: number;
  probability: number | null;
  valuationPre: number | null;
  thesis: string | null;
  sector: string | null;
  programName: string | null;
  programColor: string | null;
  officer: string | null;
  analyst: string | null;
  expectedClose: string | null;
  committees: CommitteePassage[];
  contacts: DealContact[];
  documents: DealDoc[];
};

const dn = (p?: { full_name?: string | null; email?: string | null } | null) => (p ? p.full_name || p.email || null : null);

export async function getDealDetail(id: string): Promise<DealDetail | null> {
  const supabase = await createClient();
  const { data: d } = await supabase
    .from("deals")
    .select("id, company_name, stage, amount, probability, valuation_pre, thesis, program_id, primary_sub_sector_id, investment_officer_id, analyst_id, expected_close")
    .eq("id", id).single();
  if (!d) return null;

  const [progRes, subRes, offRes, anaRes, comRes, contactRes, docRes] = await Promise.all([
    d.program_id ? supabase.from("programs").select("name, color").eq("id", d.program_id).single() : Promise.resolve({ data: null }),
    d.primary_sub_sector_id ? supabase.from("sub_sectors").select("name").eq("id", d.primary_sub_sector_id).single() : Promise.resolve({ data: null }),
    d.investment_officer_id ? supabase.from("profiles").select("full_name, email").eq("id", d.investment_officer_id).single() : Promise.resolve({ data: null }),
    d.analyst_id ? supabase.from("profiles").select("full_name, email").eq("id", d.analyst_id).single() : Promise.resolve({ data: null }),
    supabase.from("committee_passages").select("id, committee_type, session_date, decision, conditions, participants").eq("deal_id", id).order("session_date"),
    supabase.from("contacts").select("id, name, function, email").eq("deal_id", id),
    supabase.from("documents").select("id, title, category").eq("deal_id", id),
  ]);

  const prog = progRes.data as { name?: string; color?: string } | null;
  return {
    id: d.id, companyName: d.company_name, stage: d.stage, amount: Number(d.amount ?? 0),
    probability: d.probability, valuationPre: d.valuation_pre != null ? Number(d.valuation_pre) : null, thesis: d.thesis,
    sector: (subRes.data as { name?: string } | null)?.name ?? null,
    programName: prog?.name ?? null, programColor: prog?.color ?? null,
    officer: dn(offRes.data as { full_name?: string; email?: string } | null),
    analyst: dn(anaRes.data as { full_name?: string; email?: string } | null),
    expectedClose: d.expected_close,
    committees: (comRes.data ?? []).map((c) => ({ id: c.id, committeeType: c.committee_type, sessionDate: c.session_date, decision: c.decision, conditions: c.conditions, participants: c.participants })),
    contacts: contactRes.data ?? [], documents: docRes.data ?? [],
  };
}
