import { getReportingData } from "@/lib/data/reporting";
import ReportingClient from "@/components/reporting/ReportingClient";
import { requirePerm, getMyPermissions, can } from "@/lib/auth/permissions";

export default async function ReportingPage() {
  await requirePerm("reporting");
  const [data, { perms }] = await Promise.all([getReportingData(), getMyPermissions()]);
  // Consulter le suivi de collecte est une chose ; changer un statut en est une autre.
  return <ReportingClient data={data} canEdit={can(perms, "reporting", "E")} />;
}
