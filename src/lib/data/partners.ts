import { createClient } from "@/lib/supabase/server";

export type Partner = {
  id: string;
  name: string;
  relationType: string | null;
  attachment: string;
  programId: string | null;
  status: string | null;
  committed: number;
  discussion: number;
};

export type PartnerProgram = { id: string; name: string };
export type PartnersData = {
  partners: Partner[];
  totals: { committed: number; discussion: number };
  programs: PartnerProgram[];
};

export async function getPartnersData(): Promise<PartnersData> {
  const supabase = await createClient();
  const [pRes, progRes] = await Promise.all([
    supabase.from("partners").select("id, name, relation_type, program_id, fund_id, status, amount_committed, amount_discussion"),
    supabase.from("programs").select("id, name"),
  ]);
  const progMap = new Map((progRes.data ?? []).map((p) => [p.id, p.name]));

  const partners: Partner[] = (pRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    relationType: p.relation_type,
    attachment: p.program_id ? progMap.get(p.program_id) ?? "Programme" : "Fonds (global)",
    programId: p.program_id,
    status: p.status,
    committed: Number(p.amount_committed ?? 0),
    discussion: Number(p.amount_discussion ?? 0),
  }));

  return {
    partners,
    totals: {
      committed: partners.reduce((a, p) => a + p.committed, 0),
      discussion: partners.reduce((a, p) => a + p.discussion, 0),
    },
    programs: (progRes.data ?? []).map((p) => ({ id: p.id, name: p.name })),
  };
}
