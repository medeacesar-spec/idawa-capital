import { getReportingData } from "@/lib/data/reporting";
import { getFundSettings } from "@/lib/data/fundSettings";
import { resolveCadence } from "@/lib/cadence";
import ReportingClient from "@/components/reporting/ReportingClient";
import { requirePerm, getMyPermissions, can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { EXTRACTION_SETS } from "@/lib/export/extraction";
import { DATASETS } from "@/lib/export/datasets";

export default async function ReportingPage() {
  await requirePerm("reporting");
  const supabase = await createClient();
  const [data, { perms }, { data: progs }, { data: cos }, settings] = await Promise.all([
    getReportingData(),
    getMyPermissions(),
    supabase.from("programs").select("id, name, status").order("position"),
    supabase.from("portfolio_companies").select("id, name, tracking_type, program_id").order("name"),
    getFundSettings(),
  ]);
  const cadence = resolveCadence(settings.cadence, "reporting");

  // La réinjection ne s'affiche que si l'on peut écrire quelque part.
  const visibleDatasets = DATASETS.filter((d) => can(perms, d.key === "pipeline" ? "pipeline" : "portefeuille", "L"));
  const excelCanEdit = visibleDatasets.some((d) => can(perms, d.key === "pipeline" ? "pipeline" : "portefeuille", "E"));

  return (
    <ReportingClient
      data={data}
      cadence={cadence}
      canEdit={can(perms, "reporting", "E")}
      excelCanEdit={excelCanEdit}
      extractionSets={EXTRACTION_SETS}
      programs={(progs ?? []).filter((p) => p.status !== "Clos").map((p) => ({ id: p.id as string, name: p.name as string }))}
      companies={(cos ?? []).map((c) => ({ id: c.id as string, name: c.name as string, tracking: (c.tracking_type as string) ?? "equity", programId: (c.program_id as string) ?? null }))}
      datasets={visibleDatasets.map((d) => ({ key: d.key, label: d.label, hint: d.hint, editable: d.columns.filter((c) => c.editable).map((c) => c.header) }))}
    />
  );
}
