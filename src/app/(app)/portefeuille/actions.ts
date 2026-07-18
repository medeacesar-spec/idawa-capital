"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyPermissions } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { COMPANY_OUTCOME_STATUS } from "@/lib/ui-constants";

// Valide (ou annule) une décision de comité prise sur une société.
// Certaines décisions (sortie complète, radiation, mise sous surveillance) font basculer le
// statut de la société une fois validées ; les autres (réinvestissement, dépréciation,
// restructuration…) sont tracées sans toucher au statut.
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
  const newStatus = passage.outcome ? COMPANY_OUTCOME_STATUS[passage.outcome] : undefined;

  if (validate) {
    const { error } = await supabase.from("committee_passages")
      .update({ status: "Validée", validated_by: user.id, validated_at: new Date().toISOString() })
      .eq("id", passageId);
    if (error) return { error: error.message };
    if (newStatus && favorable) {
      const { error: sErr } = await supabase.from("portfolio_companies").update({ status: newStatus }).eq("id", passage.company_id);
      if (sErr) return { error: sErr.message };
    }
  } else {
    const { error } = await supabase.from("committee_passages")
      .update({ status: "Proposée", validated_by: null, validated_at: null })
      .eq("id", passageId);
    if (error) return { error: error.message };
    if (newStatus) {
      // On rouvre la participation (retour au portefeuille actif).
      const { error: sErr } = await supabase.from("portfolio_companies").update({ status: "Actif" }).eq("id", passage.company_id);
      if (sErr) return { error: sErr.message };
    }
  }

  revalidatePath(`/portefeuille/${passage.company_id}`);
  revalidatePath("/portefeuille");
  return { ok: true };
}

// Arrête (ou rouvre) la valorisation d'un exercice.
// C'est l'équivalent du comité d'audit : tant qu'elle n'est pas arrêtée, une valorisation
// reste une proposition et ne doit pas circuler comme un chiffre ferme.
// Même exigence que les décisions de comité : niveau « Validation ».
export async function setValuationValidation(flowId: string, validate: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const { perms } = await getMyPermissions();
  if (perms.comites !== "V") return { error: "Seul un rôle « Validation » (Direction / Administrateur) peut arrêter une valorisation." };

  const { data: flow } = await supabase
    .from("company_flows")
    .select("id, company_id, type, fiscal_year, amount")
    .eq("id", flowId).single();
  if (!flow) return { error: "Valorisation introuvable." };
  if (flow.type !== "Valorisation") return { error: "Cette ligne n'est pas une valorisation." };

  const { error } = await supabase.from("company_flows").update(
    validate
      ? { status: "Validée", validated_by: user.id, validated_at: new Date().toISOString() }
      : { status: "Proposée", validated_by: null, validated_at: null }
  ).eq("id", flowId);
  // L'index unique refuse un second arrêté sur le même exercice : le dire clairement.
  if (error) {
    return { error: error.code === "23505"
      ? `L'exercice ${flow.fiscal_year} a déjà une valorisation arrêtée. Annulez-la d'abord.`
      : error.message };
  }

  // La valorisation arrêtée la plus récente devient la référence de la société.
  const { data: latest } = await supabase
    .from("company_flows")
    .select("amount")
    .eq("company_id", flow.company_id).eq("type", "Valorisation").eq("status", "Validée")
    .order("fiscal_year", { ascending: false }).limit(1).maybeSingle();
  await supabase.from("portfolio_companies")
    .update({ current_valuation: latest?.amount ?? null })
    .eq("id", flow.company_id);

  revalidatePath(`/portefeuille/${flow.company_id}`);
  revalidatePath("/portefeuille");
  return { ok: true };
}
