import { getPerformanceData } from "@/lib/data/performance";
import { getPerfOverview, getPerfYtd } from "@/lib/data/perfOverview";
import PerfYtdTable from "@/components/performance/PerfYtdTable";
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
  const y = Number.isNaN(year as number) ? undefined : year;
  const [data, overview, schedule, support, ytd] = await Promise.all([getPerformanceData(), getPerfOverview(y), getFundSchedule(), getSupportOverview(), getPerfYtd(y)]);
  return (
    <PerformanceTabs
      hasSupport={support.programs.length > 0}
      equity={
        <div>
          <PerformanceClient data={data} />
          <div style={{ marginTop: 26 }}>
            <PerfYtdTable data={ytd} />
          </div>
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
