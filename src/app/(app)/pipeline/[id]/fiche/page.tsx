import { notFound } from "next/navigation";
import { getDealDetail } from "@/lib/data/dealDetail";
import { requirePerm } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { buildDealSheet } from "@/lib/reporting/dealSheet";
import { currentPeriod } from "@/lib/periods";
import DealSheetView from "@/components/pipeline/DealSheetView";

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

  const period = /^\d{4}-T[1-4]$/.test(t ?? "") ? (t as string) : currentPeriod();
  return <DealSheetView sheet={buildDealSheet(deal, period)} editedBy={editedBy} />;
}
