// Relance d'échéance : une action assignée est rappelée 2 jours avant son échéance,
// puis le jour même. Deux déclenchements nets — pas de rappel quotidien qui lasserait.
// Déclenché par Vercel Cron (voir vercel.json). Protégé par CRON_SECRET.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, reminderEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function isoPlus(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createAdminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idawa-capital.vercel.app";
  const today = isoPlus(0);
  const heads = isoPlus(2); // préavis à 2 jours

  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, due_date, assignee_id, entity_type, entity_id")
    .neq("status", "Fait")
    .not("assignee_id", "is", null)
    .in("due_date", [today, heads]);
  const rows = tasks ?? [];
  if (rows.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const dealIds = [...new Set(rows.filter((r) => r.entity_type === "deal").map((r) => r.entity_id))];
  const compIds = [...new Set(rows.filter((r) => r.entity_type === "company").map((r) => r.entity_id))];
  const [{ data: deals }, { data: comps }] = await Promise.all([
    dealIds.length ? supabase.from("deals").select("id, company_name").in("id", dealIds) : Promise.resolve({ data: [] }),
    compIds.length ? supabase.from("portfolio_companies").select("id, name").in("id", compIds) : Promise.resolve({ data: [] }),
  ]);
  const nameOf = new Map<string, string>();
  (deals ?? []).forEach((d) => nameOf.set(d.id, d.company_name ?? "—"));
  (comps ?? []).forEach((c) => nameOf.set(c.id, c.name ?? "—"));

  const assigneeIds = [...new Set(rows.map((r) => r.assignee_id).filter(Boolean) as string[])];
  const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", assigneeIds);
  const profById = new Map((profs ?? []).map((p) => [p.id, p]));

  let sent = 0;
  for (const r of rows) {
    const prof = profById.get(r.assignee_id!);
    if (!prof?.email || !r.due_date) continue;
    const { subject, html } = reminderEmail({
      fullName: prof.full_name,
      title: r.title,
      entityName: nameOf.get(r.entity_id) ?? "—",
      dueDate: r.due_date,
      overdue: false,
      link: `${site}${r.entity_type === "company" ? "/portefeuille/" : "/pipeline/"}${r.entity_id}`,
    });
    const res = await sendEmail({ to: prof.email, subject, html });
    if (res.ok) sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
