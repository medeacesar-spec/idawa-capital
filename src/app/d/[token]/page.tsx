import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { companyByToken } from "@/lib/reporting/portal";
import { calendarFor } from "@/lib/reporting/calendar";
import DepositPortal, { type PortalDeposit, type PortalPeriod } from "./DepositPortal";

export const dynamic = "force-dynamic";

// Page de dépôt de l'entreprise, ouverte par le lien personnel de son référent (sans compte).
export default async function DepositPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const co = await companyByToken(token);
  if (!co) notFound();
  const { data: deps } = await createAdminClient().from("deposits")
    .select("id, kind, period, version, created_at, reason, changes_count, warnings").eq("company_id", co.companyId).order("created_at", { ascending: false });
  const deposits: PortalDeposit[] = (deps ?? []).map((d) => ({ id: d.id, kind: d.kind, period: d.period, version: d.version, at: d.created_at,
    reason: d.reason, changes: d.changes_count, warnings: ((d.warnings as string[]) ?? []).length }));
  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  // Périodes déjà ouvertes (à déposer, déposées ou en retard), les plus récentes d'abord.
  const periods: PortalPeriod[] = [...calendarFor(co.setup, year - 1), ...calendarFor(co.setup, year)]
    .filter((p) => p.opens <= today)
    .map((p) => ({ ...p }))
    .sort((a, b) => b.due.localeCompare(a.due));
  const { data: model } = await createAdminClient().from("company_models").select("company_id").eq("company_id", co.companyId).maybeSingle();
  return <DepositPortal token={token} companyName={co.companyName} referent={co.setup.referentName} periods={periods} deposits={deposits} hasModel={!!model} />;
}
