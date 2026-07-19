import { requirePerm, getMyPermissions, can } from "@/lib/auth/permissions";
import { DATASETS } from "@/lib/export/datasets";
import ExcelBridgeClient from "@/components/reporting/ExcelBridgeClient";

export default async function ExcelBridgePage() {
  await requirePerm("reporting");
  const { perms } = await getMyPermissions();

  // On n'expose que les jeux que la personne a le droit de lire, et la réinjection
  // n'apparaît que si elle a le droit d'écrire quelque part.
  const visible = DATASETS.filter((d) => can(perms, d.key === "pipeline" ? "pipeline" : "portefeuille", "L"));
  const canEdit = visible.some((d) => can(perms, d.key === "pipeline" ? "pipeline" : "portefeuille", "E"));

  return (
    <ExcelBridgeClient
      canEdit={canEdit}
      datasets={visible.map((d) => ({
        key: d.key,
        label: d.label,
        hint: d.hint,
        editable: d.columns.filter((c) => c.editable).map((c) => c.header),
      }))}
    />
  );
}
