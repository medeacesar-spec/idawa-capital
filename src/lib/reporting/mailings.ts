// Envois du suivi des entreprises (feuille de route, phase 5) — SERVEUR UNIQUEMENT.
//
// Une fois par jour (avec la relance des actions, voir /api/cron/reminders) et à la demande
// (bouton de l'équipe sur Reporting → Dépôts des entreprises). Pour chaque période attendue et
// non déposée, un seul message selon le moment :
//   - à partir du jour d'ouverture : « ouverture » (avec le lien personnel de dépôt) ;
//   - à partir de 2 jours avant l'échéance : « rappel » ;
//   - à partir du lendemain de l'échéance (pendant 30 jours) : « retard » au référent,
//     « retard_equipe » au chargé de suivi et au suppléant.
// Chaque message ne part qu'une fois (journal reporting_messages, clé unique) : relancer l'envoi
// plusieurs fois dans la journée ne crée pas de doublon.

import { createAdminClient } from "@/lib/supabase/admin";
import { calendarFor, type CalendarPeriod, type ReportingSetup, type SeasonalShift } from "@/lib/reporting/calendar";
import { sendEmail, depositRequestEmail, depositLateTeamEmail } from "@/lib/email/resend";

type Row = Record<string, unknown>;
export type MailingResult = {
  sent: number;
  skippedNoKey: boolean;
  details: { company: string; period: string; kind: string; to: string; ok: boolean; error?: string }[];
};

const LATE_WINDOW_DAYS = 30;
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « novembre 2026 » / « Exercice 2025 » (le calendrier abrège les mois). */
export function longLabel(p: Pick<CalendarPeriod, "kind" | "period">): string {
  if (p.kind === "annuel") return `Exercice ${p.period}`;
  return `${MONTHS[Number(p.period.slice(6, 8)) - 1]} ${p.period.slice(0, 4)}`;
}

/** Date du jour à Cotonou (UTC+1, sans heure d'été). */
export function todayCotonou(now = new Date()): string {
  return new Date(now.getTime() + 3600_000).toISOString().slice(0, 10);
}
function addDays(d: string, n: number): string {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

export function setupFromRow(r: Row): ReportingSetup {
  return {
    companyId: r.company_id as string, referentName: (r.referent_name as string) ?? null, referentEmail: (r.referent_email as string) ?? null,
    referentPhone: (r.referent_phone as string) ?? null, chargeId: (r.charge_id as string) ?? null, suppleantId: (r.suppleant_id as string) ?? null,
    expectsMonthly: !!r.expects_monthly, expectsAnnual: !!r.expects_annual, openDay: r.open_day as number, dueDay: r.due_day as number,
    annualDueMonth: r.annual_due_month as number, annualDueDay: r.annual_due_day as number,
    seasonalShifts: (r.seasonal_shifts as SeasonalShift[]) ?? [], tokenRevoked: !!r.token_revoked_at, startsOn: r.starts_on as string,
  };
}

/** Message dû aujourd'hui pour une période non déposée (ou null). */
export function stepFor(p: CalendarPeriod, today: string): "ouverture" | "rappel" | "retard" | null {
  if (today < p.opens) return null;
  if (today > p.due) return today <= addDays(p.due, LATE_WINDOW_DAYS) ? "retard" : null;
  return today >= addDays(p.due, -2) ? "rappel" : "ouverture";
}

export async function runReportingMailings({ companyId, origin = "auto" }: { companyId?: string; origin?: "auto" | "manuel" } = {}): Promise<MailingResult> {
  const supabase = createAdminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idawa-capital.vercel.app";
  const today = todayCotonou();
  const year = Number(today.slice(0, 4));
  const result: MailingResult = { sent: 0, skippedNoKey: !process.env.RESEND_API_KEY, details: [] };

  let q = supabase.from("company_reporting_setup").select("*").is("token_revoked_at", null).not("referent_email", "is", null);
  if (companyId) q = q.eq("company_id", companyId);
  const { data: setups } = await q;
  if (!setups?.length) return result;

  const ids = setups.map((s) => s.company_id as string);
  const [{ data: cos }, { data: deps }, { data: msgs }, { data: people }] = await Promise.all([
    supabase.from("portfolio_companies").select("id, name").in("id", ids),
    supabase.from("deposits").select("company_id, kind, period").in("company_id", ids),
    supabase.from("reporting_messages").select("company_id, kind, period, recipient").in("company_id", ids),
    supabase.from("profiles").select("id, full_name, email"),
  ]);
  const name = new Map((cos ?? []).map((c) => [c.id as string, c.name as string]));
  const deposited = new Set((deps ?? []).map((d) => `${d.company_id}|${d.kind}|${d.period}`));
  const already = new Set((msgs ?? []).map((m) => `${m.company_id}|${m.kind}|${m.period}|${String(m.recipient).toLowerCase()}`));
  const person = new Map((people ?? []).map((p) => [p.id as string, p as { id: string; full_name: string | null; email: string | null }]));

  for (const row of setups) {
    const setup = setupFromRow(row);
    const company = name.get(setup.companyId);
    if (!company || !setup.referentEmail) continue;
    const charge = setup.chargeId ? person.get(setup.chargeId) : undefined;
    const team = [charge, setup.suppleantId ? person.get(setup.suppleantId) : undefined].filter((p): p is NonNullable<typeof p> => !!p?.email);
    const link = `${site}/d/${row.token as string}`;
    const periods = [...calendarFor(setup, year - 1, today), ...calendarFor(setup, year, today)];

    for (const p of periods) {
      if (deposited.has(`${setup.companyId}|${p.kind}|${p.period}`)) continue;
      const step = stepFor(p, today);
      if (!step) continue;
      const label = longLabel(p);

      const send = async (kind: string, to: string, mail: { subject: string; html: string }, replyTo?: string | null) => {
        const key = `${setup.companyId}|${kind}|${p.period}|${to.toLowerCase()}`;
        if (already.has(key)) return;
        if (result.skippedNoKey) { result.details.push({ company, period: label, kind, to, ok: false, error: "envoi désactivé (RESEND_API_KEY absente)" }); return; }
        // On réserve la ligne AVANT l'envoi : deux exécutions simultanées ne peuvent pas envoyer deux fois.
        const { error: lockErr } = await supabase.from("reporting_messages").insert({ company_id: setup.companyId, kind, period: p.period, recipient: to, origin });
        if (lockErr) { already.add(key); return; }
        const res = await sendEmail({ to, ...mail, replyTo });
        if (!res.ok) await supabase.from("reporting_messages").delete().match({ company_id: setup.companyId, kind, period: p.period, recipient: to });
        else { result.sent += 1; already.add(key); }
        result.details.push({ company, period: label, kind, to, ok: res.ok, error: res.error });
      };

      await send(step, setup.referentEmail, depositRequestEmail({
        step, referentName: setup.referentName, companyName: company, periodLabel: label, kind: p.kind,
        due: p.due, extraDays: p.extraDays, link, chargeName: charge?.full_name ?? null,
      }), charge?.email ?? null);

      if (step === "retard") {
        for (const t of team) {
          await send("retard_equipe", t.email!, depositLateTeamEmail({
            fullName: t.full_name, companyName: company, periodLabel: label, kind: p.kind, due: p.due,
            referentName: setup.referentName, link: `${site}/portefeuille/${setup.companyId}`,
          }));
        }
      }
    }
  }
  return result;
}
