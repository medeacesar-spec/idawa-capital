import { createClient } from "@/lib/supabase/server";

export type SubSector = { id: string; name: string };
export type Industry = { id: string; name: string; subSectors: SubSector[] };
export type KpiBasket = Record<string, Record<string, string[]>>; // subSectorId -> category -> [names]

export type KpiLibraryData = {
  industries: Industry[];
  baskets: KpiBasket;
  total: number;
};

export const KPI_CATEGORIES = ["Management", "Commercial", "Production", "Support"];

export async function getKpiLibraryData(): Promise<KpiLibraryData> {
  const supabase = await createClient();
  const [indRes, subRes, kpiRes] = await Promise.all([
    supabase.from("industries").select("id, name, position").order("position"),
    supabase.from("sub_sectors").select("id, industry_id, name, position").order("position"),
    supabase.from("kpi_library").select("sub_sector_id, category, name, position").order("position"),
  ]);

  const subs = subRes.data ?? [];
  const industries: Industry[] = (indRes.data ?? []).map((ind) => ({
    id: ind.id,
    name: ind.name,
    subSectors: subs.filter((s) => s.industry_id === ind.id).map((s) => ({ id: s.id, name: s.name })),
  }));

  const baskets: KpiBasket = {};
  for (const k of kpiRes.data ?? []) {
    if (!baskets[k.sub_sector_id]) baskets[k.sub_sector_id] = {};
    if (!baskets[k.sub_sector_id][k.category]) baskets[k.sub_sector_id][k.category] = [];
    baskets[k.sub_sector_id][k.category].push(k.name);
  }

  return { industries, baskets, total: (kpiRes.data ?? []).length };
}
