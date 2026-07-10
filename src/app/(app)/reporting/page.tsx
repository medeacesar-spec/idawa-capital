import { getReportingData } from "@/lib/data/reporting";
import ReportingClient from "@/components/reporting/ReportingClient";
import { requirePerm } from "@/lib/auth/permissions";

export default async function ReportingPage() {
  await requirePerm("reporting");
  const data = await getReportingData();
  return <ReportingClient data={data} />;
}
