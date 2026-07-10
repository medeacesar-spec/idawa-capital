import { createClient } from "@/lib/supabase/server";
import { xirr, type CashFlow } from "@/lib/finance/xirr";

export type PerfCompany = {
  name: string;
  vintage: number | null;
  paidIn: number;
  distributed: number;
  value: number;
  tvpi: number | null;
  dpi: number | null;
  irr: number | null;
};
export type PerfVintage = { year: number; count: number; paidIn: number; distributed: number; value: number; tvpi: number | null; irr: number | null };

export type PerformanceData = {
  paidIn: number;
  distributed: number;
  nav: number;
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  irr: number | null;
  companies: PerfCompany[];
  vintages: PerfVintage[];
  flowBased: boolean;
};

function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

export async function getPerformanceData(): Promise<PerformanceData> {
  const supabase = await createClient();
  const { data: cos } = await supabase
    .from("portfolio_companies")
    .select("id, name, invested_amount, invested_date, current_valuation, tracking_type")
    .eq("tracking_type", "equity");
  const companiesRaw = cos ?? [];

  const { data: flowRows } = companiesRaw.length
    ? await supabase.from("company_flows").select("company_id, flow_date, type, amount").in("company_id", companiesRaw.map((c) => c.id))
    : { data: [] as { company_id: string; flow_date: string | null; type: string | null; amount: number | null }[] };
  const flows = flowRows ?? [];

  const now = today();
  let anyFlow = false;
  const fundCF: CashFlow[] = [];

  function seriesFor(companyId: string, investedDate: string | null, investedAmount: number, currentValuation: number) {
    const mine = flows.filter((f) => f.company_id === companyId);
    const calls = mine.filter((f) => f.type === "Appel de fonds" && f.flow_date && f.amount != null);
    const dists = mine.filter((f) => f.type === "Distribution" && f.flow_date && f.amount != null);
    const valos = mine.filter((f) => f.type === "Valorisation" && f.flow_date && f.amount != null).sort((a, b) => (b.flow_date ?? "").localeCompare(a.flow_date ?? ""));
    const cf: CashFlow[] = [];
    let paidIn = 0;
    if (calls.length) { anyFlow = true; calls.forEach((k) => { paidIn += Number(k.amount); cf.push({ amount: -Number(k.amount), date: k.flow_date as string }); }); }
    else { paidIn = investedAmount; if (investedDate && paidIn > 0) cf.push({ amount: -paidIn, date: investedDate }); }
    let distributed = 0;
    if (dists.length) { anyFlow = true; dists.forEach((d) => { distributed += Number(d.amount); cf.push({ amount: Number(d.amount), date: d.flow_date as string }); }); }
    const value = valos.length ? Number(valos[0].amount) : currentValuation;
    if (value > 0) cf.push({ amount: value, date: now });
    return { cf, paidIn, distributed, value };
  }

  const companies: PerfCompany[] = companiesRaw.map((c) => {
    const investedDate = (c.invested_date as string | null) ?? null;
    const { cf, paidIn, distributed, value } = seriesFor(c.id, investedDate, Number(c.invested_amount ?? 0), Number(c.current_valuation ?? 0));
    fundCF.push(...cf);
    return {
      name: c.name,
      vintage: investedDate ? Number(investedDate.slice(0, 4)) : null,
      paidIn, distributed, value,
      tvpi: paidIn > 0 ? (distributed + value) / paidIn : null,
      dpi: paidIn > 0 ? distributed / paidIn : null,
      irr: xirr(cf),
    };
  });

  const paidIn = companies.reduce((a, c) => a + c.paidIn, 0);
  const distributed = companies.reduce((a, c) => a + c.distributed, 0);
  const nav = companies.reduce((a, c) => a + c.value, 0);

  const vintMap = new Map<number, { count: number; paidIn: number; distributed: number; value: number; cf: CashFlow[] }>();
  for (const c of companiesRaw) {
    const inv = c.invested_date as string | null;
    if (!inv) continue;
    const yr = Number(inv.slice(0, 4));
    if (!vintMap.has(yr)) vintMap.set(yr, { count: 0, paidIn: 0, distributed: 0, value: 0, cf: [] });
    const v = vintMap.get(yr)!;
    const s = seriesFor(c.id, inv, Number(c.invested_amount ?? 0), Number(c.current_valuation ?? 0));
    v.count++; v.paidIn += s.paidIn; v.distributed += s.distributed; v.value += s.value; v.cf.push(...s.cf);
  }
  const vintages: PerfVintage[] = Array.from(vintMap.entries())
    .map(([year, v]) => ({ year, count: v.count, paidIn: v.paidIn, distributed: v.distributed, value: v.value, tvpi: v.paidIn > 0 ? (v.distributed + v.value) / v.paidIn : null, irr: xirr(v.cf) }))
    .sort((a, b) => b.year - a.year);

  return {
    paidIn, distributed, nav,
    tvpi: paidIn > 0 ? (distributed + nav) / paidIn : null,
    dpi: paidIn > 0 ? distributed / paidIn : null,
    rvpi: paidIn > 0 ? nav / paidIn : null,
    irr: xirr(fundCF),
    companies: companies.sort((a, b) => (b.tvpi ?? 0) - (a.tvpi ?? 0)),
    vintages,
    flowBased: anyFlow,
  };
}
