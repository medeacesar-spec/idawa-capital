import { NextResponse } from "next/server";
import { getMyPermissions, can } from "@/lib/auth/permissions";
import { buildWorkbook, zipFiles } from "@/lib/export/xlsx";
import { buildIpFicheWorkbook, buildOneCompany, resolveSelection, MAX_COMPANIES, type FicheSelection } from "@/lib/export/ipFicheEntreprise";

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Fiche entreprise au format du modèle I&P, pour une société, une sélection de sociétés
 * ou un portefeuille entier.
 */
export async function GET(req: Request) {
  const { perms } = await getMyPermissions();
  if (!can(perms, "portefeuille", "L")) return new NextResponse("Accès refusé.", { status: 403 });

  const p = new URL(req.url).searchParams;
  const now = new Date();
  const year = Number(p.get("annee")) || now.getFullYear();
  const quarter = Math.min(4, Math.max(1, Number(p.get("trimestre")) || Math.floor(now.getMonth() / 3) + 1));
  const count = Math.min(24, Math.max(4, Number(p.get("trimestres")) || 12));

  const mode = p.get("mode") ?? "societes";
  let selection: FicheSelection;
  if (mode === "programme") {
    const programId = p.get("programme");
    if (!programId) return new NextResponse("Programme manquant.", { status: 400 });
    selection = { mode: "programme", programId };
  } else if (mode === "portefeuille") {
    const t = p.get("suivi");
    selection = { mode: "portefeuille", tracking: t === "equity" || t === "accompagnement" ? t : undefined };
  } else {
    selection = { mode: "societes", ids: (p.get("ids") ?? "").split(",").filter(Boolean) };
  }

  try {
    const companies = await resolveSelection(selection);
    if (!companies.length) return new NextResponse("Aucune société ne correspond à la sélection.", { status: 400 });

    // Le reporting trimestriel couvre TOUT LE PORTEFEUILLE, mais le modèle I&P est une
    // fiche PAR ENTREPRISE. La sortie normale est donc une archive contenant un fichier
    // par société, chacun à l'ossature exacte du modèle. Le classeur unique à blocs
    // empilés reste disponible (`forme=comparaison`) pour lire les sociétés côte à côte.
    const forme = p.get("forme") === "comparaison" ? "comparaison" : "modele";

    if (companies.length === 1 || forme === "comparaison") {
      const { sheets } = await buildIpFicheWorkbook(companies, year, quarter, count);
      const buf = buildWorkbook(sheets);
      const label = companies.length === 1 ? slugify(companies[0].name) : `${companies.length}-societes-comparaison`;
      const name = `Fiche entreprise - ${label} - ${year}-T${quarter}.xlsx`;
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${name}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (companies.length > MAX_COMPANIES) {
      return new NextResponse(`Sélection trop large (${companies.length} sociétés, maximum ${MAX_COMPANIES}).`, { status: 400 });
    }

    const files: { name: string; data: Buffer }[] = [];
    for (const co of companies) {
      const { sheets } = await buildOneCompany(co.id, year, quarter, count);
      files.push({
        name: `Fiche entreprise - ${slugify(co.name)} - ${year}-T${quarter}.xlsx`,
        data: buildWorkbook(sheets),
      });
    }

    const zip = zipFiles(files);
    const archive = `Reporting trimestriel ${year}-T${quarter} - ${companies.length} fiches.zip`;
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${archive}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "Erreur inconnue", { status: 400 });
  }
}
