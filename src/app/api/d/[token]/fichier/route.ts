import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { companyByToken } from "@/lib/reporting/portal";
import { downloadItem } from "@/lib/sharepoint/write";

// « Télécharger mon dernier fichier » : uniquement un dépôt de l'entreprise du jeton.
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const co = await companyByToken(token);
  if (!co) return new NextResponse("Lien invalide ou désactivé", { status: 403 });
  const sp = new URL(req.url).searchParams;
  // Classeur de référence (à remplir), tant qu'aucun dépôt n'existe ou à tout moment.
  if (sp.get("modele")) {
    const { data: m } = await createAdminClient().from("company_models").select("original_name, sharepoint_writes(item_id)").eq("company_id", co.companyId).maybeSingle();
    const mid = (m?.sharepoint_writes as unknown as { item_id: string } | null)?.item_id;
    if (!m || !mid) return new NextResponse("Votre classeur n'est pas encore disponible : Idawa vous l'enverra.", { status: 404 });
    try {
      const f = await downloadItem(mid);
      return new NextResponse(new Uint8Array(f.bytes), { headers: {
        "Content-Type": "application/octet-stream", "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(m.original_name ?? f.name)}`,
      } });
    } catch { return new NextResponse("Fichier indisponible pour le moment", { status: 502 }); }
  }
  const id = sp.get("id") ?? "";
  const { data: d } = await createAdminClient().from("deposits").select("id, original_name, sharepoint_writes(item_id)")
    .eq("id", id).eq("company_id", co.companyId).maybeSingle();
  const itemId = (d?.sharepoint_writes as unknown as { item_id: string } | null)?.item_id;
  if (!d || !itemId) return new NextResponse("Fichier introuvable", { status: 404 });
  try {
    const f = await downloadItem(itemId);
    return new NextResponse(new Uint8Array(f.bytes), { headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(d.original_name ?? f.name)}`,
      "Cache-Control": "no-store",
    } });
  } catch { return new NextResponse("Fichier indisponible pour le moment", { status: 502 }); }
}
