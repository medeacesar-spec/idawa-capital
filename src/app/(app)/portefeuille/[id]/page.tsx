import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/lib/data/companyDetail";
import CompanyDetailClient from "@/components/portfolio/CompanyDetailClient";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompanyDetail(id);
  if (!company) notFound();
  return <CompanyDetailClient company={company} />;
}
