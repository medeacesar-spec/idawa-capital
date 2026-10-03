import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, getMyPermissions } from "@/lib/auth/permissions";
import { SharePointError, fullPath, getItem, listChildren, resolveFolderUrl, sharePointConfigured } from "@/lib/sharepoint/graph";

// Vue en direct du dossier SharePoint d'une entreprise (onglet Documents).
//   GET  ?entity=deal|company&id=<uuid>[&item=<id sous-dossier>]  → contenu du dossier
//   POST { entity, id, url }                                       → rattache un dossier (lien collé)
//
// L'accès suit les droits de l'application : on ne lit que le dossier rattaché à une fiche
// que l'utilisateur peut voir, et jamais un élément situé en dehors de ce dossier.

const TABLE = { deal: "deals", company: "portfolio_companies" } as const;
const DOMAIN = { deal: "pipeline", company: "portefeuille" } as const;
type Entity = keyof typeof TABLE;

function fail(e: unknown) {
  const status = e instanceof SharePointError ? e.status : 500;
  const message = e instanceof SharePointError ? e.message : "Erreur inattendue";
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function loadEntity(entity: string | null, id: string | null, min: "L" | "E") {
  if (!entity || !(entity in TABLE) || !id) throw new SharePointError("Requête incomplète", 400);
  const e = entity as Entity;
  const { perms } = await getMyPermissions();
  if (!can(perms, DOMAIN[e], min)) throw new SharePointError("Accès refusé", 403);
  const supabase = await createClient();
  const { data, error } = await supabase.from(TABLE[e]).select("id, sharepoint_folder_id, sharepoint_folder_url").eq("id", id).maybeSingle();
  if (error || !data) throw new SharePointError("Fiche introuvable", 404);
  return { e, row: data as { id: string; sharepoint_folder_id: string | null; sharepoint_folder_url: string | null }, supabase };
}

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const { row } = await loadEntity(q.get("entity"), q.get("id"), "L");
    if (!sharePointConfigured()) return NextResponse.json({ ok: true, configured: false, folderUrl: row.sharepoint_folder_url });
    if (!row.sharepoint_folder_id) return NextResponse.json({ ok: true, configured: true, linked: false });

    const root = await getItem(row.sharepoint_folder_id);
    const itemId = q.get("item") || row.sharepoint_folder_id;
    if (itemId !== row.sharepoint_folder_id) {
      // Garde-fou : le sous-dossier demandé doit se trouver SOUS le dossier de l'entreprise.
      const sub = await getItem(itemId);
      const rootPath = fullPath(root);
      if (!fullPath(sub).startsWith(rootPath + "/")) throw new SharePointError("Élément hors du dossier de l'entreprise", 403);
    }
    const items = await listChildren(itemId);
    return NextResponse.json({ ok: true, configured: true, linked: true, root: { name: root.name, webUrl: root.webUrl }, items });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { entity?: string; id?: string; url?: string };
    const { e, row, supabase } = await loadEntity(body.entity ?? null, body.id ?? null, "E");
    if (!body.url?.trim()) {
      await supabase.from(TABLE[e]).update({ sharepoint_folder_id: null, sharepoint_folder_url: null }).eq("id", row.id);
      return NextResponse.json({ ok: true, linked: false });
    }
    if (!sharePointConfigured()) throw new SharePointError("Connexion SharePoint non configurée", 503);
    const folder = await resolveFolderUrl(body.url);
    const { error } = await supabase.from(TABLE[e]).update({ sharepoint_folder_id: folder.id, sharepoint_folder_url: folder.webUrl }).eq("id", row.id);
    if (error) throw new SharePointError("Enregistrement impossible", 500);
    return NextResponse.json({ ok: true, linked: true, root: { name: folder.name, webUrl: folder.webUrl } });
  } catch (e) {
    return fail(e);
  }
}
