import { notFound } from "next/navigation";
import { getProgramConfig } from "@/lib/data/params";
import ProgramConfigClient from "@/components/params/ProgramConfigClient";

export default async function ProgramConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = await getProgramConfig(id);
  if (!config) notFound();
  return <ProgramConfigClient config={config} />;
}
