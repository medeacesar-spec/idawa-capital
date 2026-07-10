import { createClient } from "@/lib/supabase/server";

export type PerfCompany = {
  name: string;
  invested: number;
  valuation: number;
  tvpi: number | null;
  tri: number | null;
};

export type PerformanceData = {
  invested: number;
  valuation: number;
  gain: number;
  tvpi: number | null;
  dpi: number;
  tri: number | null;
  companies: PerfCompany[];
};

export async function getPerformanceData(): Promise<PerformanceData> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_companies")
    .select("name, invested_amount, current_valuation, tvpi, tri, tracking_type")
    .eq("tracking_type", "equity");

  const companies: PerfCompany[] = (data ?? []).map((c) => ({
    name: c.name,
    invested: Number(c.invested_amount ?? 0),
    valuation: Number(c.current_valuation ?? 0),
    tvpi: c.tvpi != null ? Number(c.tvpi) : null,
    tri: c.tri != null ? Number(c.tri) : null,
  }));

  const invested = companies.reduce((a, c) => a + c.invested, 0);
  const valuation = companies.reduce((a, c) => a + c.valuation, 0);
  const triVals = companies.filter((c) => c.tri != null).map((c) => c.tri as number);

  return {
    invested,
    valuation,
    gain: valuation - invested,
    tvpi: invested > 0 ? valuation / invested : null,
    dpi: 0, // aucune distribution/sortie enregistrée pour l'instant
    tri: triVals.length ? triVals.reduce((a, b) => a + b, 0) / triVals.length : null,
    companies: [...companies].sort((a, b) => (b.tvpi ?? 0) - (a.tvpi ?? 0)),
  };
}
