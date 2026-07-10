import { getPipelineData } from "@/lib/data/pipeline";
import PipelineClient from "@/components/pipeline/PipelineClient";

export default async function PipelinePage() {
  const data = await getPipelineData();
  return <PipelineClient data={data} />;
}
