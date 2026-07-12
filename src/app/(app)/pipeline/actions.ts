"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyPermissions } from "@/lib/auth/permissions";
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
  revalidatePath("/pipeline");
  return { ok: true };
}
