import { NextResponse } from "next/server";
import { getMyPermissions, can } from "@/lib/auth/permissions";
import { buildWorkbook } from "@/lib/export/xlsx";
import { buildExtraction, EXTRACTION_SETS, type ExtractionScope } from "@/lib/export/extraction";

/** Extraction à la carte : plusieurs jeux, un seul classeur. */
export async function GET(req: Request) {
  const { perms } = await getMyPermissions();
  if (!can(perms, "reporting", "L")) return new NextResponse("Accès refusé.", { status: 403 });

  const p = new URL(req.url).searchParams;
  const known = new Set(EXTRACTION_SETS.map((s) => s.key));
  const keys = (p.get("jeux") ?? "").split(",").filter((k) => known.has(k));
  if (!keys.length) return new NextResponse("Aucun jeu de données sélectionné.", { status: 400 });

  // Le pipeline relève d'un autre domaine de droits que le portefeuille.
  if (keys.includes("pipeline") && !can(perms, "pipeline", "L")) {
    return new NextResponse("Vous n'avez pas accès au pipeline.", { status: 403 });
  }

  const tracking = p.get("suivi");
  const scope: ExtractionScope = {
    companyIds: (p.get("societes") ?? "").split(",").filter(Boolean),
    programId: p.get("programme") || undefined,
    tracking: tracking === "equity" || tracking === "accompagnement" ? tracking : undefined,
    from: p.get("de") || undefined,
    to: p.get("a") || undefined,
  };

  try {
    const sheets = await buildExtraction(keys, scope);
    const buf = buildWorkbook(sheets);
    const name = `Extraction Idawa - ${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "Erreur inconnue", { status: 400 });
  }
}
