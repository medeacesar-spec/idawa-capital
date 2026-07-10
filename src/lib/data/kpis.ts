import { createClient } from "@/lib/supabase/server";

export type KpiSeries = {
  id: string;
  category: string;
  name: string;
  unit: string | null;
  target: number | null;
  direction: string;
  series: { period: string; value: number }[];
};

export type LibraryKpi = { id: string; category: string; name: string };

/** KPIs de la bibliothèque correspondant au(x) sous-secteur(s) de l'entité. */
export async function getKpiLibraryForEntity(entityType: "deal" | "company", entityId: string): Promise<LibraryKpi[]> {
  const supabase = await createClient();
  const table = entityType === "deal" ? "deals" : "portfolio_companies";
  const linkTable = entityType === "deal" ? "deal_sub_sectors" : "company_sub_sectors";
  const linkCol = entityType === "deal" ? "deal_id" : "company_id";

  const [entRes, linkRes] = await Promise.all([
    supabase.from(table).select("primary_sub_sector_id").eq("id", entityId).single(),
    supabase.from(linkTable).select("sub_sector_id").eq(linkCol, entityId),
  ]);
  const ids = new Set<string>();
  const primary = (entRes.data as { primary_sub_sector_id?: string } | null)?.primary_sub_sector_id;
  if (primary) ids.add(primary);
  (linkRes.data ?? []).forEach((r) => r.sub_sector_id && ids.add(r.sub_sector_id));
  if (ids.size === 0) return [];

  const { data } = await supabase.from("kpi_library").select("id, category, name").in("sub_sector_id", Array.from(ids)).order("position");
  return (data ?? []).map((x) => ({ id: x.id, category: x.category, name: x.name }));
}

export async function getKpis(entityType: "deal" | "company", entityId: string): Promise<KpiSeries[]> {
  const supabase = await createClient();
  const { data: tracked } = await supabase
    .from("tracked_kpis")
    .select("id, category, name, unit, target, direction")
    .eq("entity_type", entityType).eq("entity_id", entityId)
    .order("created_at");
  if (!tracked || tracked.length === 0) return [];
  const { data: vals } = await supabase
    .from("kpi_values")
    .select("tracked_kpi_id, period, value")
    .in("tracked_kpi_id", tracked.map((t) => t.id))
    .order("period");
  return tracked.map((t) => ({
    id: t.id, category: t.category, name: t.name, unit: t.unit,
    target: t.target != null ? Number(t.target) : null,
    direction: t.direction ?? "high",
    series: (vals ?? []).filter((v) => v.tracked_kpi_id === t.id).map((v) => ({ period: v.period, value: Number(v.value) })),
  }));
}
