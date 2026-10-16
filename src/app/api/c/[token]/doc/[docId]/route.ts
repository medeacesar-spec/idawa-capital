import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberByToken } from "@/lib/committee-portal";

// Téléchargement d'une pièce du dossier de séance par un membre extérieur :
// jeton valide, séance ouverte, pièce de SA séance ; chaque téléchargement est journalisé.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; docId: string }> }) {
  const { token, docId } = await params;
  const m = await memberByToken(token);
  if (!m || m.sessionStatus !== "Ouverte" || !m.acceptedAt) return new NextResponse("Accès refusé", { status: 403 });
  const admin = createAdminClient();
  const { data: d } = await admin.from("committee_documents")
    .select("id, name, storage_path, committee_session_items!inner(session_id)")
    .eq("id", docId).eq("committee_session_items.session_id", m.sessionId).maybeSingle();
  if (!d) return new NextResponse("Document introuvable", { status: 404 });
  const { data: signed } = await admin.storage.from("documents").createSignedUrl(d.storage_path, 60, { download: d.name });
  if (!signed?.signedUrl) return new NextResponse("Document indisponible", { status: 502 });
  await admin.from("committee_access_log").insert({ member_id: m.id, document_id: d.id, action: "Téléchargement" });
  return NextResponse.redirect(signed.signedUrl);
}
