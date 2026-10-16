import { createAdminClient } from "@/lib/supabase/admin";

// Portail des membres extérieurs d'un comité : tout passe par le JETON personnel.
// Pas de session : client administrateur côté serveur, toujours borné à la séance du jeton.
// SERVEUR UNIQUEMENT.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PortalMember = {
  id: string; name: string; sessionId: string; acceptedAt: string | null;
  sessionStatus: "Préparation" | "Ouverte" | "Close";
};

/** Membre du jeton, ou null (jeton inconnu, accès retiré). */
export async function memberByToken(token: string): Promise<PortalMember | null> {
  if (!UUID.test(token)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("committee_session_members")
    .select("id, name, session_id, confidentiality_accepted_at, revoked_at, committee_sessions(status)")
    .eq("token", token).maybeSingle();
  if (!data || data.revoked_at) return null;
  return {
    id: data.id, name: data.name, sessionId: data.session_id, acceptedAt: data.confidentiality_accepted_at,
    sessionStatus: (data.committee_sessions as unknown as { status: PortalMember["sessionStatus"] }).status,
  };
}

/** Le dossier (item) appartient-il à la séance du membre ? */
export async function itemInSession(itemId: string, sessionId: string): Promise<boolean> {
  if (!UUID.test(itemId)) return false;
  const { data } = await createAdminClient().from("committee_session_items").select("id").eq("id", itemId).eq("session_id", sessionId).maybeSingle();
  return !!data;
}
