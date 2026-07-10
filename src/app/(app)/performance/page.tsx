import { getPerformanceData } from "@/lib/data/performance";
import PerformanceClient from "@/components/performance/PerformanceClient";
import { requirePerm } from "@/lib/auth/permissions";

export default async function PerformancePage() {
  await requirePerm("consolide");
  const data = await getPerformanceData();
  return <PerformanceClient data={data} />;
}
