import { notFound } from "next/navigation";
import { getDealDetail } from "@/lib/data/dealDetail";
import DealDetailClient from "@/components/pipeline/DealDetailClient";
import { getMyPermissions, can } from "@/lib/auth/permissions";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [deal, { perms }] = await Promise.all([getDealDetail(id), getMyPermissions()]);
  if (!deal) notFound();
  const comites = perms.comites ?? "-";
  const canEditComites = comites === "E" || comites === "V";
  const canValidateComites = comites === "V";
  return <DealDetailClient deal={deal} canEditComites={canEditComites} canValidateComites={canValidateComites} canEdit={can(perms, "pipeline", "E")} />;
}
