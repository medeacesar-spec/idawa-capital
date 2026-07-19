import { getReportingData } from "@/lib/data/reporting";
import ReportingClient from "@/components/reporting/ReportingClient";
import { requirePerm, getMyPermissions, can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { EXTRACTION_SETS } from "@/lib/export/extraction";

export default async function ReportingPage() {
  await requirePerm("reporting");
  const supabase = await createClient();
  const [data, { perms }, { data: progs }] = await Promise.all([
    getReportingData(),
    getMyPermissions(),
    supabase.from("programs").select("id, name, status").order("position"),
  ]);

  // Consulter le suivi de collecte est une chose ; changer un statut en est une autre.
  return (
    <ReportingClient
      data={data}
      canEdit={can(perms, "reporting", "E")}
      extractionSets={EXTRACTION_SETS}
      programs={(progs ?? []).filter((p) => p.status !== "Clos").map((p) => ({ id: p.id as string, name: p.name as string }))}
    />
  );
}
