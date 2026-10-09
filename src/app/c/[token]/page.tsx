import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberByToken } from "@/lib/committee-portal";
import { loadSession } from "@/lib/data/committees";
import MemberPortalClient, { type PortalSession } from "./MemberPortalClient";

export const dynamic = "force-dynamic";

// Portail d'un membre extérieur de comité, ouvert par son lien personnel.
export default async function CommitteePortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const m = await memberByToken(token);
  if (!m) notFound();

  const admin = createAdminClient();
  const s = await loadSession(admin, m.sessionId);
  if (!s) notFound();
  await admin.from("committee_session_members").update({ last_seen_at: new Date().toISOString() }).eq("id", m.id);

  // Rien de sensible ne part vers le navigateur : ni jetons, ni e-mails des autres membres,
  // ni chemins de stockage (les pièces se téléchargent par /api/c/<jeton>/doc/<id>).
  const session: PortalSession = {
    committeeType: s.committeeType, title: s.title, sessionDate: s.sessionDate, opinionDeadline: s.opinionDeadline, status: s.status,
    members: s.members.filter((x) => !x.revokedAt).map((x) => ({ id: x.id, name: x.name, organization: x.organization })),
    items: s.items.map((i) => ({
      id: i.id, name: i.name, summary: i.summary, sector: i.sector,
      documents: i.documents.map((d) => ({ id: d.id, name: d.name, size: d.size })),
      opinions: i.opinions, comments: i.comments.map((c) => ({ id: c.id, authorName: c.authorName, fromIdawa: c.fromIdawa, memberId: c.memberId, body: c.body, createdAt: c.createdAt })),
    })),
  };
  return <MemberPortalClient token={token} meId={m.id} meName={m.name} accepted={!!m.acceptedAt} session={session} />;
}
