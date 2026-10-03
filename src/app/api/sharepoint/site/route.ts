import { NextResponse } from "next/server";
import { can, getMyPermissions, isExternalRole } from "@/lib/auth/permissions";
import { SharePointError, fullPath, getItem, getItemByPath, listChildren, sharePointConfigured } from "@/lib/sharepoint/graph";

// Espace partagé « Idawa Capital », lu en direct depuis la page Documents.
//   GET [?item=<id sous-dossier>]
//
// Racine exposée : le dossier « General » du site d'équipe (pipeline, portefeuille, conseil,
// politiques…). Les dossiers rangés hors de « General » (RH, Finances, Reporting) ne sont
// jamais accessibles par ici. L'application lit SharePoint avec SES droits, pas ceux de la
// personne : les rôles externes (auditeur, observateur / LP) n'y ont donc pas accès.

const ROOT_PATH = process.env.MS_SP_DOCUMENTS_ROOT || "General";

export async function GET(req: Request) {
  try {
    const { perms, roleName } = await getMyPermissions();
    if (!can(perms, "documents", "L") || isExternalRole(roleName)) throw new SharePointError("Accès refusé", 403);
    if (!sharePointConfigured()) return NextResponse.json({ ok: true, configured: false });

    const root = await getItemByPath(ROOT_PATH);
    const item = new URL(req.url).searchParams.get("item");
    if (item && item !== root.id) {
      const sub = await getItem(item);
      if (!fullPath(sub).startsWith(fullPath(root) + "/")) throw new SharePointError("Élément hors de l'espace partagé", 403);
    }
    const items = await listChildren(item || root.id);
    return NextResponse.json({ ok: true, configured: true, linked: true, root: { name: "Espace partagé Idawa Capital", webUrl: root.webUrl }, items });
  } catch (e) {
    const status = e instanceof SharePointError ? e.status : 500;
    return NextResponse.json({ ok: false, error: e instanceof SharePointError ? e.message : "Erreur inattendue" }, { status });
  }
}
