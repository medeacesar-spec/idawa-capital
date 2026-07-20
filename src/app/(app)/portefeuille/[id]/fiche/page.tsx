import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/lib/data/companyDetail";
import { requirePerm } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { buildCompanySheet } from "@/lib/reporting/companySheet";
import { currentPeriod } from "@/lib/periods";
import { getFundSettings } from "@/lib/data/fundSettings";
import { resolveCadence } from "@/lib/cadence";
import CompanySheetView from "@/components/portfolio/CompanySheetView";

// Accepte une période mensuelle, trimestrielle ou annuelle.
const VALID_PERIOD = /^\d{4}(-M(0[1-9]|1[0-2])|-T[1-4])?$/;

export default async function CompanySheetPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  await requirePerm("portefeuille");
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const company = await getCompanyDetail(id);
  if (!company) notFound();

  // Qui édite la fiche : le document sort du fonds, il doit être signé.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, email").eq("id", user.id).single()
    : { data: null };
  const editedBy = profile?.full_name || profile?.email || user?.email || "—";

  // Par défaut : la période courante dans la cadence de reporting de la société (via son programme).
  const settings = await getFundSettings();
  const cadence = resolveCadence(settings.cadence, "reporting", company.programId);
  const period = VALID_PERIOD.test(t ?? "") ? (t as string) : currentPeriod(cadence);
  return <CompanySheetView sheet={buildCompanySheet(company, period)} editedBy={editedBy} />;
}
