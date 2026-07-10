import { createClient } from "@/lib/supabase/server";
import SaisieClient from "@/components/saisie/SaisieClient";

export default async function SaisiePage({ searchParams }: { searchParams: Promise<{ scope?: string; entity?: string; company?: string }> }) {
  const { scope, entity, company } = await searchParams;
  const preselect = entity ?? company ?? null;
  const isPipeline = scope === "pipeline";
  const supabase = await createClient();

  if (isPipeline) {
    const { data } = await supabase.from("deals").select("id, company_name, primary_sub_sector_id").eq("status", "actif").order("company_name");
    const companies = (data ?? []).map((d) => ({ id: d.id, name: d.company_name, subSectorId: d.primary_sub_sector_id as string | null }));
    return <SaisieClient companies={companies} entityType="deal" scopeLabel="Pipeline · dossier" preselect={preselect} />;
  }

  const { data } = await supabase.from("portfolio_companies").select("id, name, primary_sub_sector_id").order("name");
  const companies = (data ?? []).map((c) => ({ id: c.id, name: c.name, subSectorId: c.primary_sub_sector_id as string | null }));
  return <SaisieClient companies={companies} entityType="company" scopeLabel="Portefeuille · participation" preselect={preselect} />;
}
