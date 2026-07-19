// Récap périodique : chaque personne reçoit la liste de SES actions ouvertes.
// Déclenché par Vercel Cron (voir vercel.json). Protégé par CRON_SECRET.
// Sans RESEND_API_KEY, sendEmail ignore proprement — la route tourne sans rien envoyer.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, digestEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createAdminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idawa-capital.vercel.app";

  // Actions ouvertes assignées.
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, due_date, status, assignee_id, entity_type, entity_id")
    .neq("status", "Fait")
    .not("assignee_id", "is", null);
  const rows = tasks ?? [];
  if (rows.length === 0) return NextResponse.json({ ok: true, sent: 0, note: "Aucune action ouverte." });

  // Noms des entités (dossiers + sociétés) en un seul aller-retour par table.
  const dealIds = [...new Set(rows.filter((r) => r.entity_type === "deal").map((r) => r.entity_id))];
  const compIds = [...new Set(rows.filter((r) => r.entity_type === "company").map((r) => r.entity_id))];
  const [{ data: deals }, { data: comps }] = await Promise.all([
    dealIds.length ? supabase.from("deals").select("id, company_name").in("id", dealIds) : Promise.resolve({ data: [] }),
    compIds.length ? supabase.from("portfolio_companies").select("id, name").in("id", compIds) : Promise.resolve({ data: [] }),
  ]);
  const nameOf = new Map<string, string>();
  (deals ?? []).forEach((d) => nameOf.set(d.id, d.company_name ?? "—"));
  (comps ?? []).forEach((c) => nameOf.set(c.id, c.name ?? "—"));

  // Destinataires.
  const assigneeIds = [...new Set(rows.map((r) => r.assignee_id).filter(Boolean) as string[])];
  const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", assigneeIds);
  const profById = new Map((profs ?? []).map((p) => [p.id, p]));

  // Regrouper par personne, trier par urgence (échéance croissante, sans échéance en dernier).
  const byUser = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = byUser.get(r.assignee_id!) ?? [];
    arr.push(r);
    byUser.set(r.assignee_id!, arr);
  }

  let sent = 0;
  for (const [uid, items] of byUser) {
    const prof = profById.get(uid);
    if (!prof?.email) continue;
    items.sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
    const { subject, html } = digestEmail({
      fullName: prof.full_name,
      siteUrl: site,
      items: items.map((it) => ({
        title: it.title,
        entityName: nameOf.get(it.entity_id) ?? "—",
        dueDate: it.due_date,
        status: it.status,
        link: `${site}${it.entity_type === "company" ? "/portefeuille/" : "/pipeline/"}${it.entity_id}`,
      })),
    });
    const res = await sendEmail({ to: prof.email, subject, html });
    if (res.ok) sent += 1;
  }

  return NextResponse.json({ ok: true, recipients: byUser.size, sent });
}
