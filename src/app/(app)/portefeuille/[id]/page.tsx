import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/lib/data/companyDetail";
import { getFundSettings } from "@/lib/data/fundSettings";
import { resolveCadence } from "@/lib/cadence";
import CompanyDetailClient from "@/components/portfolio/CompanyDetailClient";
import { getMyPermissions, can } from "@/lib/auth/permissions";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company, { perms }, settings] = await Promise.all([getCompanyDetail(id), getMyPermissions(), getFundSettings()]);
  if (!company) notFound();
  const comites = perms.comites ?? "-";
  return (
    <CompanyDetailClient
      company={company}
      canEditComites={comites === "E" || comites === "V"}
      canValidateComites={comites === "V"}
      canEdit={can(perms, "portefeuille", "E")}
      supportCadence={resolveCadence(settings.cadence, "support", company.programId)}
      kpisCadence={resolveCadence(settings.cadence, "kpis", company.programId)}
    />
  );
}
