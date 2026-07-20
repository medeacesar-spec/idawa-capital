"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { QData } from "@/lib/impact/questionnaire";

// Soumission par l'ENTREPRENEUR via le lien public. L'accès est gardé par le jeton :
// pas de session, on passe par le client admin côté serveur, borné à la ligne du jeton.
export async function submitQuestionnaire(token: string, data: QData): Promise<{ ok?: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("impact_questionnaires").select("id, status").eq("token", token).single();
  if (!row) return { error: "Lien invalide ou expiré." };
  if (row.status === "Validé") return { error: "Ce questionnaire a déjà été validé et clôturé par Idawa Capital." };
  const { error } = await admin
    .from("impact_questionnaires")
    .update({ data, status: "Reçu", submitted_at: new Date().toISOString() })
    .eq("token", token);
  if (error) return { error: error.message };
  return { ok: true };
}
