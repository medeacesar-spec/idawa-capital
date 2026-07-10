import { getKpiLibraryData } from "@/lib/data/kpiLibrary";
import KpiLibraryClient from "@/components/kpi/KpiLibraryClient";
import { requirePerm } from "@/lib/auth/permissions";

export default async function KpiPage() {
  await requirePerm("config");
  const data = await getKpiLibraryData();
  return <KpiLibraryClient data={data} />;
}
