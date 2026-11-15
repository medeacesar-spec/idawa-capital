import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportingSetup, SeasonalShift } from "./calendar";

// Page de dépôt d'une entreprise : tout passe par le JETON du lien personnel (pas de compte).
// Client administrateur côté serveur, toujours borné à l'entreprise du jeton. SERVEUR UNIQUEMENT.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PortalCompany = { companyId: string; companyName: string; setup: ReportingSetup };

export async function companyByToken(token: string): Promise<PortalCompany | null> {
  if (!UUID.test(token)) return null;
  const admin = createAdminClient();
  const { data: r } = await admin.from("company_reporting_setup").select("*, portfolio_companies(name)").eq("token", token).maybeSingle();
  if (!r || r.token_revoked_at) return null;
  return {
    companyId: r.company_id, companyName: (r.portfolio_companies as unknown as { name: string } | null)?.name ?? "Entreprise",
    setup: { companyId: r.company_id, referentName: r.referent_name, referentEmail: r.referent_email, referentPhone: r.referent_phone,
      chargeId: r.charge_id, suppleantId: r.suppleant_id, expectsMonthly: r.expects_monthly, expectsAnnual: r.expects_annual,
      openDay: r.open_day, dueDay: r.due_day, annualDueMonth: r.annual_due_month, annualDueDay: r.annual_due_day,
      seasonalShifts: (r.seasonal_shifts as SeasonalShift[]) ?? [], tokenRevoked: false, startsOn: r.starts_on },
  };
}
