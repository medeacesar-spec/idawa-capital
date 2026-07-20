import { notFound } from "next/navigation";
import { getDealDetail } from "@/lib/data/dealDetail";
import { requirePerm } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { buildDealSheet } from "@/lib/reporting/dealSheet";
import { currentPeriod } from "@/lib/periods";
import { getFundSettings } from "@/lib/data/fundSettings";
import { resolveCadence } from "@/lib/cadence";
import DealSheetView from "@/components/pipeline/DealSheetView";

const VALID_PERIOD = /^\d{4}(-M(0[1-9]|1[0-2])|-T[1-4])?$/;

export default async function DealSheetPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  await requirePerm("pipeline");
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const deal = await getDealDetail(id);
  if (!deal) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, email").eq("id", user.id).single()
    : { data: null };
  const editedBy = profile?.full_name || profile?.email || user?.email || "—";

  const settings = await getFundSettings();
  const progId = deal.programs.find((p) => p.principal)?.id ?? deal.programs[0]?.id ?? null;
  const cadence = resolveCadence(settings.cadence, "reporting", progId);
  const period = VALID_PERIOD.test(t ?? "") ? (t as string) : currentPeriod(cadence);
  return <DealSheetView sheet={buildDealSheet(deal, period)} editedBy={editedBy} />;
}
