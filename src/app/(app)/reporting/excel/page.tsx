import { requirePerm, getMyPermissions, can } from "@/lib/auth/permissions";
import { DATASETS } from "@/lib/export/datasets";
import { createClient } from "@/lib/supabase/server";
import { EXTRACTION_SETS } from "@/lib/export/extraction";
import ExcelBridgeClient from "@/components/reporting/ExcelBridgeClient";

export default async function ExcelBridgePage() {
  await requirePerm("reporting");
  const { perms } = await getMyPermissions();

  // La fiche I&P se tire sur une société, plusieurs, ou un portefeuille entier :
  // l'écran a besoin des listes pour offrir ce choix.
  const supabase = await createClient();
  const [{ data: cos }, { data: progs }] = await Promise.all([
    supabase.from("portfolio_companies").select("id, name, tracking_type, program_id").order("name"),
    supabase.from("programs").select("id, name, status").order("position"),
  ]);

  // On n'expose que les jeux que la personne a le droit de lire, et la réinjection
  // n'apparaît que si elle a le droit d'écrire quelque part.
  const visible = DATASETS.filter((d) => can(perms, d.key === "pipeline" ? "pipeline" : "portefeuille", "L"));
  const canEdit = visible.some((d) => can(perms, d.key === "pipeline" ? "pipeline" : "portefeuille", "E"));

  return (
    <ExcelBridgeClient
      canEdit={canEdit}
      companies={(cos ?? []).map((c) => ({ id: c.id as string, name: c.name as string, tracking: (c.tracking_type as string) ?? "equity", programId: (c.program_id as string) ?? null }))}
      extractionSets={EXTRACTION_SETS}
      programs={(progs ?? []).filter((p) => p.status !== "Clos").map((p) => ({ id: p.id as string, name: p.name as string }))}
      datasets={visible.map((d) => ({
        key: d.key,
        label: d.label,
        hint: d.hint,
        editable: d.columns.filter((c) => c.editable).map((c) => c.header),
      }))}
    />
  );
}
