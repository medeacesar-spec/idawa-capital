import { getPerformanceData } from "@/lib/data/performance";
import { getPerfOverview } from "@/lib/data/perfOverview";
import { getFundSchedule } from "@/lib/data/fundSchedule";
import { getSupportOverview } from "@/lib/data/supportOverview";
import PerformanceClient from "@/components/performance/PerformanceClient";
import PerfOverviewTable from "@/components/performance/PerfOverviewTable";
import FundScheduleTable from "@/components/performance/FundScheduleTable";
import SupportOverviewBlock from "@/components/performance/SupportOverview";
import PerformanceTabs from "@/components/performance/PerformanceTabs";
import { requirePerm } from "@/lib/auth/permissions";

export default async function PerformancePage({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  await requirePerm("consolide");
  const { annee } = await searchParams;
  const year = annee ? parseInt(annee, 10) : undefined;
  const [data, overview, schedule, support] = await Promise.all([getPerformanceData(), getPerfOverview(Number.isNaN(year as number) ? undefined : year), getFundSchedule(), getSupportOverview()]);
  return (
    <PerformanceTabs
      hasSupport={support.programs.length > 0}
      equity={
        <div>
          <PerformanceClient data={data} />
          <div style={{ marginTop: 26 }}>
            <PerfOverviewTable data={overview} />
          </div>
          <div style={{ marginTop: 26 }}>
            <FundScheduleTable data={schedule} />
          </div>
        </div>
      }
      support={<SupportOverviewBlock data={support} />}
    />
  );
}
