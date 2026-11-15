import { getReportingData } from "@/lib/data/reporting";
import { getFundSettings } from "@/lib/data/fundSettings";
import ReportingClient from "@/components/reporting/ReportingClient";
import { requirePerm, getMyPermissions, can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { EXTRACTION_SETS } from "@/lib/export/extraction";
import { DATASETS } from "@/lib/export/datasets";
import type { BoardRow } from "@/components/reporting/DepositsBoard";
import type { SeasonalShift } from "@/lib/reporting/calendar";

export default async function ReportingPage() {
  await requirePerm("reporting");
  const supabase = await createClient();
  const [data, { perms }, { data: progs }, { data: cos }, settings] = await Promise.all([
    getReportingData(),
    getMyPermissions(),
    supabase.from("programs").select("id, name, status").order("position"),
    supabase.from("portfolio_companies").select("id, name, tracking_type, program_id").order("name"),
    getFundSettings(),
  ]);
  const [{ data: setups }, { data: people }, { data: deps }, { data: msgs }] = await Promise.all([
    supabase.from("company_reporting_setup").select("*"),
    supabase.from("profiles").select("id, full_name, email"),
    supabase.from("deposits").select("company_id, kind, period, version"),
    supabase.from("reporting_messages").select("company_id, kind, period, sent_at").order("sent_at", { ascending: false }).limit(500),
  ]);
  const who = new Map((people ?? []).map((p) => [p.id as string, (p.full_name || p.email) as string]));
  const coName = new Map((cos ?? []).map((c) => [c.id as string, c.name as string]));
  const board: BoardRow[] = (setups ?? []).filter((r) => coName.has(r.company_id)).map((r) => ({
    companyId: r.company_id, name: coName.get(r.company_id)!, referent: r.referent_name, charge: r.charge_id ? who.get(r.charge_id) ?? null : null,
    suppleant: r.suppleant_id ? who.get(r.suppleant_id) ?? null : null,
    deposits: (deps ?? []).filter((d) => d.company_id === r.company_id).map((d) => ({ kind: d.kind as string, period: d.period as string, version: d.version as number })),
    lastMessage: (() => { const m = (msgs ?? []).find((x) => x.company_id === r.company_id && !String(x.kind).endsWith("_equipe")); return m ? { kind: m.kind as string, period: m.period as string, sentAt: m.sent_at as string } : null; })(),
    setup: { companyId: r.company_id, referentName: r.referent_name, referentEmail: r.referent_email, referentPhone: r.referent_phone,
      chargeId: r.charge_id, suppleantId: r.suppleant_id, expectsMonthly: r.expects_monthly, expectsAnnual: r.expects_annual,
      openDay: r.open_day, dueDay: r.due_day, annualDueMonth: r.annual_due_month, annualDueDay: r.annual_due_day,
      seasonalShifts: (r.seasonal_shifts as SeasonalShift[]) ?? [], tokenRevoked: !!r.token_revoked_at, startsOn: r.starts_on },
  }));
  const configured = new Set(board.map((b) => b.companyId));
  const unconfigured = (cos ?? []).filter((c) => !configured.has(c.id as string)).map((c) => ({ id: c.id as string, name: c.name as string }));

  // La réinjection ne s'affiche que si l'on peut écrire quelque part.
  const visibleDatasets = DATASETS.filter((d) => can(perms, d.key === "pipeline" ? "pipeline" : "portefeuille", "L"));
  const excelCanEdit = visibleDatasets.some((d) => can(perms, d.key === "pipeline" ? "pipeline" : "portefeuille", "E"));

  return (
    <ReportingClient
      data={data}
      cadenceSettings={settings.cadence}
      canEdit={can(perms, "reporting", "E")}
      excelCanEdit={excelCanEdit}
      extractionSets={EXTRACTION_SETS}
      programs={(progs ?? []).filter((p) => p.status !== "Clos").map((p) => ({ id: p.id as string, name: p.name as string }))}
      companies={(cos ?? []).map((c) => ({ id: c.id as string, name: c.name as string, tracking: (c.tracking_type as string) ?? "equity", programId: (c.program_id as string) ?? null }))}
      depositsBoard={board}
      depositsUnconfigured={unconfigured}
      datasets={visibleDatasets.map((d) => ({ key: d.key, label: d.label, hint: d.hint, editable: d.columns.filter((c) => c.editable).map((c) => c.header) }))}
    />
  );
}
