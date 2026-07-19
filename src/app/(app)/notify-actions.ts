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
import { sendEmail, assignmentEmail, decisionEmail, digestEmail, pendingValidationEmail } from "@/lib/email/resend";

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

// Envoyer à SOI-MÊME un récap de test — pour vérifier que la chaîne d'email fonctionne
// (clé Resend, domaine, adresse) sans attendre le cron hebdomadaire.
export async function sendTestDigest(): Promise<{ ok: boolean; skipped?: boolean; error?: string; onVercel?: boolean }> {
  const onVercel = process.env.VERCEL === "1";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié.", onVercel };
  const { data: prof } = await supabase.from("profiles").select("email, full_name").eq("id", user.id).single();
  if (!prof?.email) return { ok: false, error: "Aucune adresse email n'est renseignée sur votre profil.", onVercel };

  const admin = createAdminClient();
  const { data: tasks } = await admin
    .from("tasks")
    .select("title, due_date, status, entity_type, entity_id")
    .eq("assignee_id", user.id).neq("status", "Fait");
  const rows = tasks ?? [];
  const dealIds = [...new Set(rows.filter((r) => r.entity_type === "deal").map((r) => r.entity_id))];
  const compIds = [...new Set(rows.filter((r) => r.entity_type === "company").map((r) => r.entity_id))];
  const [{ data: deals }, { data: comps }] = await Promise.all([
    dealIds.length ? admin.from("deals").select("id, company_name").in("id", dealIds) : Promise.resolve({ data: [] }),
    compIds.length ? admin.from("portfolio_companies").select("id, name").in("id", compIds) : Promise.resolve({ data: [] }),
  ]);
  const nameOf = new Map<string, string>();
  (deals ?? []).forEach((d) => nameOf.set(d.id, d.company_name ?? "—"));
  (comps ?? []).forEach((c) => nameOf.set(c.id, c.name ?? "—"));

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idawa-capital.vercel.app";
  const { subject, html } = digestEmail({
    fullName: prof.full_name as string | null,
    siteUrl: site,
    items: rows.map((it) => ({
      title: it.title, entityName: nameOf.get(it.entity_id) ?? "—",
      dueDate: it.due_date, status: it.status,
      link: `${site}${it.entity_type === "company" ? "/portefeuille/" : "/pipeline/"}${it.entity_id}`,
    })),
  });
  const res = await sendEmail({ to: prof.email as string, subject: `[Test] ${subject}`, html });
  return { ok: res.ok, skipped: res.skipped, error: res.error, onVercel };
}

// Prévenir les personnes habilitées à VALIDER qu'une décision de comité (dossier OU
// société) attend leur validation. Symétrique pipeline/portefeuille : appelé depuis le
// modal de comité partagé, donc identique des deux côtés.
export async function notifyPendingValidation(input: {
  committeeType: string;
  decision: string | null;
  entityType: "deal" | "company";
  entityId: string;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const actorId = user?.id ?? null;

  const admin = createAdminClient();
  const [{ data: roles }, { data: people }] = await Promise.all([
    admin.from("roles").select("id, permissions"),
    admin.from("profiles").select("id, email, full_name, role_id").not("email", "is", null),
  ]);
  // Un valideur = rôle dont le niveau « comités » est V (validation) ou E (édition).
  const validatorRoles = new Set(
    (roles ?? []).filter((r) => { const lvl = (r.permissions as Record<string, string> | null)?.comites; return lvl === "V" || lvl === "E"; }).map((r) => r.id)
  );
  // On inclut aussi un profil sans rôle : l'app lui accorde les droits admin (amorçage).
  const recipients = (people ?? []).filter((p) => p.id !== actorId && (p.role_id == null || validatorRoles.has(p.role_id)));
  if (recipients.length === 0) return;

  const table = input.entityType === "company" ? "portfolio_companies" : "deals";
  const column = input.entityType === "company" ? "name" : "company_name";
  const [{ data: entity }, { data: actor }] = await Promise.all([
    admin.from(table).select(column).eq("id", input.entityId).single(),
    actorId ? admin.from("profiles").select("full_name").eq("id", actorId).single() : Promise.resolve({ data: null }),
  ]);
  const entityName = (entity as Record<string, string> | null)?.[column] ?? "—";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idawa-capital.vercel.app";
  const path = input.entityType === "company" ? `/portefeuille/${input.entityId}` : `/pipeline/${input.entityId}`;
  const link = `${base}${path}`;

  for (const v of recipients) {
    const { subject, html } = pendingValidationEmail({
      fullName: v.full_name as string | null,
      committeeType: input.committeeType,
      decision: input.decision,
      entityName,
      proposedBy: (actor?.full_name as string | null) ?? null,
      link,
    });
    await sendEmail({ to: v.email as string, subject, html });
  }
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
