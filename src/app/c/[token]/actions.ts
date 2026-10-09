"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { itemInSession, memberByToken } from "@/lib/committee-portal";
import { COMMITTEE_DECISIONS } from "@/lib/ui-constants";

// Actions du membre extérieur, gardées par son jeton : la séance doit être OUVERTE et le
// dossier doit appartenir à SA séance.

type Result = { ok?: boolean; error?: string };

async function guard(token: string, itemId?: string) {
  const m = await memberByToken(token);
  if (!m) return { error: "Lien invalide ou accès retiré." } as const;
  if (m.sessionStatus !== "Ouverte") return { error: "La séance n'est pas ouverte aux avis." } as const;
  if (!m.acceptedAt) return { error: "Merci d'accepter d'abord l'engagement de confidentialité." } as const;
  if (itemId && !(await itemInSession(itemId, m.sessionId))) return { error: "Dossier inconnu pour cette séance." } as const;
  return { m } as const;
}

export async function acceptConfidentiality(token: string): Promise<Result> {
  const m = await memberByToken(token);
  if (!m) return { error: "Lien invalide ou accès retiré." };
  const admin = createAdminClient();
  await admin.from("committee_session_members").update({ confidentiality_accepted_at: new Date().toISOString() }).eq("id", m.id).is("confidentiality_accepted_at", null);
  await admin.from("committee_access_log").insert({ member_id: m.id, action: "Confidentialité acceptée" });
  revalidatePath(`/c/${token}`);
  return { ok: true };
}

export async function saveOpinion(token: string, itemId: string, input: { conflict: boolean; opinion: string | null; conditions: string; comment: string }): Promise<Result> {
  const g = await guard(token, itemId);
  if ("error" in g) return { error: g.error };
  const opinion = input.conflict ? null : input.opinion;
  if (opinion && !COMMITTEE_DECISIONS.includes(opinion)) return { error: "Avis invalide." };
  const { error } = await createAdminClient().from("committee_opinions").upsert({
    item_id: itemId, member_id: g.m.id, conflict: input.conflict, opinion,
    conditions: opinion === "Favorable sous conditions" ? input.conditions.trim() || null : null,
    comment: input.comment.trim() || null, updated_at: new Date().toISOString(),
  }, { onConflict: "item_id,member_id" });
  if (error) return { error: error.message };
  revalidatePath(`/c/${token}`);
  return { ok: true };
}

export async function postComment(token: string, itemId: string, body: string): Promise<Result> {
  const g = await guard(token, itemId);
  if ("error" in g) return { error: g.error };
  if (!body.trim()) return { error: "Message vide." };
  const { error } = await createAdminClient().from("committee_comments").insert({ item_id: itemId, member_id: g.m.id, author_name: g.m.name, body: body.trim().slice(0, 5000) });
  if (error) return { error: error.message };
  revalidatePath(`/c/${token}`);
  return { ok: true };
}
