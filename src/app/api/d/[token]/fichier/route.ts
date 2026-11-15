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
  const id = new URL(req.url).searchParams.get("id") ?? "";
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
