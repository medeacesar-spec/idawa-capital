import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/lib/data/companyDetail";
import { requirePerm } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { buildCompanySheet } from "@/lib/reporting/companySheet";
import { currentPeriod } from "@/lib/periods";
import CompanySheetView from "@/components/portfolio/CompanySheetView";

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

  const period = /^\d{4}-T[1-4]$/.test(t ?? "") ? (t as string) : currentPeriod();
  return <CompanySheetView sheet={buildCompanySheet(company, period)} editedBy={editedBy} />;
}
