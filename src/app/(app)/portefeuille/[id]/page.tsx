import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/lib/data/companyDetail";
import CompanyDetailClient from "@/components/portfolio/CompanyDetailClient";
import { getMyPermissions } from "@/lib/auth/permissions";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company, { perms }] = await Promise.all([getCompanyDetail(id), getMyPermissions()]);
  if (!company) notFound();
  const comites = perms.comites ?? "-";
  return (
    <CompanyDetailClient
      company={company}
      canEditComites={comites === "E" || comites === "V"}
      canValidateComites={comites === "V"}
    />
  );
}
