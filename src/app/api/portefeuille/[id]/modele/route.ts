import { NextResponse } from "next/server";
import { getMyPermissions } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SharePointError } from "@/lib/sharepoint/graph";
import { addFile, checkFile, downloadItem, writeConfigured } from "@/lib/sharepoint/write";
import { checkModel, DepositError, parseWorkbook } from "@/lib/reporting/deposit";

// Classeur de référence d'une entreprise : conçu par l'équipe à partir du gabarit (ses lignes propres
// et leurs codes), puis intégré ici. L'ERP le vérifie, le range dans « Idawa Depots » (ajout seul) et
// retient ses codes ; l'entrepreneur le retrouve sur sa page de dépôt.
export const runtime = "nodejs";

const MAX = 4 * 1024 * 1024;

async function staff(level: "L" | "E") {
  const { perms } = await getMyPermissions();
  const p = perms.portefeuille ?? "";
  return level === "L" ? ["L", "E", "V"].includes(p) : ["E", "V"].includes(p);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await staff("L"))) return new NextResponse("Accès refusé.", { status: 403 });
  const { id } = await params;
  const { data: m } = await createAdminClient().from("company_models").select("original_name, sharepoint_writes(item_id)").eq("company_id", id).maybeSingle();
  const itemId = (m?.sharepoint_writes as unknown as { item_id: string } | null)?.item_id;
  if (!m || !itemId) return new NextResponse("Aucun classeur intégré pour cette entreprise.", { status: 404 });
  try {
    const f = await downloadItem(itemId);
    return new NextResponse(new Uint8Array(f.bytes), { headers: {
      "Content-Type": "application/octet-stream", "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(m.original_name ?? f.name)}`,
    } });
  } catch { return new NextResponse("Fichier indisponible pour le moment.", { status: 502 }); }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await staff("E"))) return NextResponse.json({ ok: false, error: "Droit « Portefeuille » en édition requis." }, { status: 403 });
  if (!writeConfigured()) return NextResponse.json({ ok: false, error: "Écriture SharePoint non configurée." }, { status: 503 });
  const { id } = await params;
  const admin = createAdminClient();
  const { data: co } = await admin.from("portfolio_companies").select("id, name").eq("id", id).maybeSingle();
  if (!co) return NextResponse.json({ ok: false, error: "Entreprise introuvable." }, { status: 404 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Aucun fichier reçu." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ ok: false, error: "Fichier trop lourd (4 Mo au plus)." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const refused = checkFile(bytes, file.name, "xlsx");
  if (refused) return NextResponse.json({ ok: false, error: refused }, { status: 400 });

  let parsed;
  try { parsed = parseWorkbook(Buffer.from(bytes), "mensuel"); }
  catch (e) { return NextResponse.json({ ok: false, error: e instanceof DepositError ? e.message : "Classeur illisible." }, { status: 400 }); }
  const { errors, warnings } = checkModel(parsed, co.name as string, parsed.entity ?? null);
  const codes = Array.from(new Set(parsed.lines.map((l) => l.code)));
  if (errors.length) return NextResponse.json({ ok: false, errors, warnings, lines: codes.length }, { status: 400 });

  try {
    const { count } = await admin.from("sharepoint_writes").select("id", { count: "exact", head: true }).eq("company_id", id).eq("kind", "modele");
    const w = await addFile({ companyId: id, companyName: co.name as string, kind: "modele", period: null, version: (count ?? 0) + 1,
      originalName: file.name, bytes, fileKind: "xlsx", origin: "equipe" });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await admin.from("company_models").upsert({ company_id: id, write_id: w.id, original_name: file.name.slice(0, 200), codes, lines_count: codes.length,
      warnings, updated_at: new Date().toISOString(), updated_by: user?.id ?? null });
    return NextResponse.json({ ok: true, lines: codes.length, warnings });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof SharePointError ? e.message : "Erreur pendant l'enregistrement." }, { status: e instanceof SharePointError ? e.status : 500 });
  }
}
