import { redirect } from "next/navigation";
import { getMyPermissions, can } from "@/lib/auth/permissions";
import PipelineImportClient from "@/components/pipeline/PipelineImportClient";

export default async function PipelineImportPage() {
  // Importer, c'est créer des dossiers : la page exige le droit d'écriture sur le pipeline,
  // pas seulement celui de le lire.
  const { perms } = await getMyPermissions();
  if (!can(perms, "pipeline", "E")) redirect("/pipeline");
  return <PipelineImportClient />;
}
