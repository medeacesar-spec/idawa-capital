import { createClient } from "@/lib/supabase/server";
import SaisieClient from "@/components/saisie/SaisieClient";

export default async function SaisiePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_companies")
    .select("id, name, primary_sub_sector_id, tracking_type")
    .order("name");
  const companies = (data ?? []).map((c) => ({ id: c.id, name: c.name, subSectorId: c.primary_sub_sector_id as string | null }));
  return <SaisieClient companies={companies} />;
}
