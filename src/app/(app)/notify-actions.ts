"use server";

// Prévenir par email la personne à qui une action est assignée.
//
// Une action assignée dans l'outil ne se voit que si l'on ouvre l'outil. Le destinataire
// apprenait donc son affectation au comité suivant, ou jamais.
//
// Trois garde-fous, parce qu'un email de trop décrédibilise tous les suivants :
//   · on ne se notifie pas soi-même ;
//   · on ne notifie qu'un CHANGEMENT d'affectation, pas chaque modification de l'action ;
//   · sans clé d'envoi configurée, la fonction ne fait rien et ne bloque rien.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, assignmentEmail, decisionEmail } from "@/lib/email/resend";

export type AssignmentKind = "Action de suivi" | "Action E&S" | "Initiative de création de valeur" | "Point de due diligence";

export async function notifyAssignment(input: {
  kind: AssignmentKind;
  title: string;
  assigneeId: string;
  dueDate?: string | null;
  entityType: "deal" | "company";
  entityId: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, skipped: true };

  // Se notifier soi-même n'apprend rien à personne.
  if (input.assigneeId === user.id) return { ok: false, skipped: true };

  const [{ data: assignee }, { data: actor }] = await Promise.all([
    supabase.from("profiles").select("email, full_name").eq("id", input.assigneeId).single(),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);
  if (!assignee?.email) return { ok: false, skipped: true };

  const table = input.entityType === "company" ? "portfolio_companies" : "deals";
  const column = input.entityType === "company" ? "name" : "company_name";
  const { data: entity } = await supabase.from(table).select(column).eq("id", input.entityId).single();
  const entityName = (entity as Record<string, string> | null)?.[column] ?? "—";

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idawa-capital.vercel.app";
  const path = input.entityType === "company" ? `/portefeuille/${input.entityId}` : `/pipeline/${input.entityId}`;

  const { subject, html } = assignmentEmail({
    fullName: assignee.full_name as string | null,
    assignedBy: (actor?.full_name as string | null) ?? null,
    kind: input.kind,
    title: input.title,
    dueDate: input.dueDate ?? null,
    entityName,
    link: `${base}${path}`,
  });

  const res = await sendEmail({ to: assignee.email as string, subject, html });
  return { ok: res.ok, skipped: res.skipped };
}

// Prévenir l'ÉQUIPE qu'une décision de comité vient d'être validée (investissement,
// sortie, radiation…). On informe tout le monde SAUF la personne qui valide.
export async function notifyDecision(input: {
  committeeType: string;
  outcome: string | null;
  decision: string | null;
  entityType: "deal" | "company";
  entityId: string;
  actorId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const table = input.entityType === "company" ? "portfolio_companies" : "deals";
  const column = input.entityType === "company" ? "name" : "company_name";
  const [{ data: entity }, { data: actor }, { data: users }] = await Promise.all([
    admin.from(table).select(column).eq("id", input.entityId).single(),
    admin.from("profiles").select("full_name").eq("id", input.actorId).single(),
    admin.from("profiles").select("id, email, full_name").not("email", "is", null),
  ]);
  const entityName = (entity as Record<string, string> | null)?.[column] ?? "—";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idawa-capital.vercel.app";
  const path = input.entityType === "company" ? `/portefeuille/${input.entityId}` : `/pipeline/${input.entityId}`;
  const link = `${base}${path}`;

  for (const u of users ?? []) {
    if (u.id === input.actorId || !u.email) continue; // pas la personne qui valide
    const { subject, html } = decisionEmail({
      fullName: u.full_name as string | null,
      committeeType: input.committeeType,
      outcome: input.outcome,
      decision: input.decision,
      entityName,
      validatedBy: (actor?.full_name as string | null) ?? null,
      link,
    });
    await sendEmail({ to: u.email as string, subject, html });
  }
}
