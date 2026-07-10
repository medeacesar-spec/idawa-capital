import { getKpiLibraryData } from "@/lib/data/kpiLibrary";
import KpiLibraryClient from "@/components/kpi/KpiLibraryClient";

export default async function KpiPage() {
  const data = await getKpiLibraryData();
  return <KpiLibraryClient data={data} />;
}
