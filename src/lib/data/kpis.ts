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
