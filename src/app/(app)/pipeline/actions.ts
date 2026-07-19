"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyPermissions } from "@/lib/auth/permissions";
import { notifyDecision } from "@/app/(app)/notify-actions";
import { revalidatePath } from "next/cache";

// Valide (ou annule la validation) d'un passage en comité.
// Réservé aux rôles ayant le niveau « Validation » sur le domaine comités.
export async function setCommitteeValidation(passageId: string, validate: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const { perms } = await getMyPermissions();
  if (perms.comites !== "V") return { error: "Seul un rôle « Validation » (Direction / Administrateur) peut valider un comité." };

  const payload = validate
    ? { status: "Validée", validated_by: user.id, validated_at: new Date().toISOString() }
    : { status: "Proposée", validated_by: null, validated_at: null };
  const { error } = await supabase.from("committee_passages").update(payload).eq("id", passageId);
  if (error) return { error: error.message };

  // À la validation, informer l'équipe de la décision.
  if (validate) {
    const { data: p } = await supabase
      .from("committee_passages")
      .select("committee_type, outcome, decision, deal_id")
      .eq("id", passageId).single();
    if (p?.deal_id) {
      await notifyDecision({
        committeeType: p.committee_type, outcome: p.outcome ?? null, decision: p.decision ?? null,
        entityType: "deal", entityId: p.deal_id, actorId: user.id,
      });
    }
  }

  revalidatePath("/pipeline");
  return { ok: true };
}
