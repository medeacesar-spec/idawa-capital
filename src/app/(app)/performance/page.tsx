import { getPerformanceData } from "@/lib/data/performance";
import PerformanceClient from "@/components/performance/PerformanceClient";

export default async function PerformancePage() {
  const data = await getPerformanceData();
  return <PerformanceClient data={data} />;
}
