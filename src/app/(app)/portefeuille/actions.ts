"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyPermissions } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";

// Valide (ou annule) une décision de comité prise sur une société.
// Une décision « Sortie » / « Radiation » favorable, une fois validée, bascule le statut de la société.
// Réservé aux rôles ayant le niveau « Validation » sur le domaine comités.
export async function setCompanyDecisionValidation(passageId: string, validate: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const { perms } = await getMyPermissions();
  if (perms.comites !== "V") return { error: "Seul un rôle « Validation » (Direction / Administrateur) peut valider une décision de comité." };

  const { data: passage } = await supabase
    .from("committee_passages")
    .select("id, company_id, outcome, decision")
    .eq("id", passageId).single();
  if (!passage) return { error: "Décision introuvable." };
  if (!passage.company_id) return { error: "Cette décision n'est pas rattachée à une société." };

  const favorable = passage.decision === "Favorable" || passage.decision === "Favorable sous conditions";
  const lifecycle = passage.outcome === "Sortie" || passage.outcome === "Radiation";

  if (validate) {
    const { error } = await supabase.from("committee_passages")
      .update({ status: "Validée", validated_by: user.id, validated_at: new Date().toISOString() })
      .eq("id", passageId);
    if (error) return { error: error.message };
    if (lifecycle && favorable) {
      const newStatus = passage.outcome === "Sortie" ? "Sorti" : "Radié";
      const { error: sErr } = await supabase.from("portfolio_companies").update({ status: newStatus }).eq("id", passage.company_id);
      if (sErr) return { error: sErr.message };
    }
  } else {
    const { error } = await supabase.from("committee_passages")
      .update({ status: "Proposée", validated_by: null, validated_at: null })
      .eq("id", passageId);
    if (error) return { error: error.message };
    if (lifecycle) {
      // On rouvre la participation (retour au portefeuille actif).
      const { error: sErr } = await supabase.from("portfolio_companies").update({ status: "Actif" }).eq("id", passage.company_id);
      if (sErr) return { error: sErr.message };
    }
  }

  revalidatePath(`/portefeuille/${passage.company_id}`);
  revalidatePath("/portefeuille");
  return { ok: true };
}
