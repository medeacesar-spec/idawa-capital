import { requirePerm } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getEsgAnnualReport } from "@/lib/data/esgAnnualReport";
import EsgAnnualReportView from "@/components/esg/EsgAnnualReportView";

export default async function EsgAnnualReportPage({
  searchParams,
}: { searchParams: Promise<{ annee?: string }> }) {
  // Le rapport consolide tout le portefeuille : même porte que la vue ESG globale.
  await requirePerm("consolide");
  const { annee } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, email").eq("id", user.id).single()
    : { data: null };

  const year = annee && /^\d{4}$/.test(annee) ? Number(annee) : undefined;
  const report = await getEsgAnnualReport(year);

  return <EsgAnnualReportView report={report} editedBy={profile?.full_name || profile?.email || "—"} />;
}
