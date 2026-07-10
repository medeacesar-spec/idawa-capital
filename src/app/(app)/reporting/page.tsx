import { getReportingData } from "@/lib/data/reporting";
import ReportingClient from "@/components/reporting/ReportingClient";

export default async function ReportingPage() {
  const data = await getReportingData();
  return <ReportingClient data={data} />;
}
