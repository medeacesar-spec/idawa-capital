import { getPipelineData } from "@/lib/data/pipeline";
import PipelineClient from "@/components/pipeline/PipelineClient";
import { getMyPermissions, can, requirePerm } from "@/lib/auth/permissions";

export default async function PipelinePage() {
  await requirePerm("pipeline");
  const [data, { perms }] = await Promise.all([getPipelineData(), getMyPermissions()]);
  return <PipelineClient data={data} canEdit={can(perms, "pipeline", "E")} />;
}
