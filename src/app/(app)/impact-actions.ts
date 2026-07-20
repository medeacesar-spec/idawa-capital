"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, impactQuestionnaireEmail } from "@/lib/email/resend";
import type { QData } from "@/lib/impact/questionnaire";

type Entity = { entityType: "deal" | "company"; entityId: string };

// Créer un exercice (une ligne société × année) — statut Brouillon, jeton généré.
export async function createQuestionnaire(input: Entity & { year: number; contactName?: string; contactEmail?: string }): Promise<{ ok?: boolean; error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const { data, error } = await supabase
    .from("impact_questionnaires")
    .insert({ entity_type: input.entityType, entity_id: input.entityId, year: input.year, contact_name: input.contactName || null, contact_email: input.contactEmail || null })
    .select("id").single();
  if (error) return { error: error.code === "23505" ? `Un questionnaire ${input.year} existe déjà pour cette entreprise.` : error.message };
  return { ok: true, id: data.id };
}

export async function setQuestionnaireContact(id: string, name: string, email: string): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("impact_questionnaires").update({ contact_name: name || null, contact_email: email || null }).eq("id", id);
  return error ? { error: error.message } : { ok: true };
}

// Envoyer le lien à l'entrepreneur par email + passer au statut Envoyé.
export async function sendQuestionnaire(id: string): Promise<{ ok?: boolean; error?: string; skipped?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const { data: row } = await supabase
    .from("impact_questionnaires")
    .select("token, year, contact_name, contact_email, entity_type, entity_id")
    .eq("id", id).single();
  if (!row) return { error: "Questionnaire introuvable." };
  if (!row.contact_email) return { error: "Renseignez d'abord l'email de l'entrepreneur." };

  const admin = createAdminClient();
  const table = row.entity_type === "company" ? "portfolio_companies" : "deals";
  const column = row.entity_type === "company" ? "name" : "company_name";
  const { data: ent } = await admin.from(table).select(column).eq("id", row.entity_id).single();
  const entityName = (ent as Record<string, string> | null)?.[column] ?? "votre entreprise";

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idawa-capital.vercel.app";
  const link = `${base}/q/${row.token}`;
  const { subject, html } = impactQuestionnaireEmail({ contactName: row.contact_name, entityName, year: row.year, link });
  const res = await sendEmail({ to: row.contact_email, subject, html });

  await supabase.from("impact_questionnaires").update({ status: "Envoyé", sent_at: new Date().toISOString() }).eq("id", id);
  return { ok: res.ok, skipped: res.skipped, error: res.error };
}

// Corrections d'Idawa avant validation.
export async function saveQuestionnaireData(id: string, data: QData): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("impact_questionnaires").update({ data }).eq("id", id);
  return error ? { error: error.message } : { ok: true };
}

// Valider (clôturer) le questionnaire reçu.
export async function validateQuestionnaire(id: string, validate: boolean): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const patch = validate
    ? { status: "Validé", validated_at: new Date().toISOString(), validated_by: user.id }
    : { status: "Reçu", validated_at: null, validated_by: null };
  const { error } = await supabase.from("impact_questionnaires").update(patch).eq("id", id);
  return error ? { error: error.message } : { ok: true };
}
