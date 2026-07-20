import { getProgramsForParams } from "@/lib/data/params";
import { getFundSettings } from "@/lib/data/fundSettings";
import ParametresClient from "@/components/params/ParametresClient";
import { requirePerm } from "@/lib/auth/permissions";

export default async function ParametresPage() {
  await requirePerm("config", "E");
  const [programs, settings] = await Promise.all([getProgramsForParams(), getFundSettings()]);
  return <ParametresClient programs={programs} fundId={settings.fundId} cadence={settings.cadence} />;
}
