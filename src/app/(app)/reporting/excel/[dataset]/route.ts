import { NextResponse } from "next/server";
import { getMyPermissions, can } from "@/lib/auth/permissions";
import { buildWorkbook } from "@/lib/export/xlsx";
import { buildDatasetSheets, datasetByKey } from "@/lib/export/datasets";

/** Téléchargement d'un jeu de données au format .xlsx. Lecture seule. */
export async function GET(_req: Request, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await params;
  const def = datasetByKey(dataset);
  if (!def) return new NextResponse("Jeu de données inconnu.", { status: 404 });

  // Exporter, c'est lire — mais lire tout le portefeuille : on exige le domaine concerné.
  const { perms } = await getMyPermissions();
  const domain = def.key === "pipeline" ? "pipeline" : "portefeuille";
  if (!can(perms, domain, "L")) return new NextResponse("Accès refusé.", { status: 403 });

  const sheets = await buildDatasetSheets(def);
  const buf = buildWorkbook(sheets);
  const name = `idawa-${def.key}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
