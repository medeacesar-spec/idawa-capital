import { createClient } from "@/lib/supabase/server";
import { computeOhada } from "@/lib/finance/ohada";

/** Performance annuelle d'une société : réalisé N, réalisé N-1, budget N. */
export type PerfRow = {
  companyId: string;
  company: string;
  ca: number | null; caPrev: number | null; caBudget: number | null;
  ebe: number | null; ebePrev: number | null; ebeBudget: number | null;
};
export type PerfOverview = { year: number; years: number[]; rows: PerfRow[] };

const CA_LABEL = "Chiffre d'affaires";
const EBE_LABEL = "Excédent brut d'exploitation (EBE)";

export async function getPerfOverview(year?: number): Promise<PerfOverview> {
  const supabase = await createClient();
  const [coRes, finRes, stmtRes] = await Promise.all([
    supabase.from("portfolio_companies").select("id, name, tracking_type, status").order("name"),
    supabase.from("company_financials").select("company_id, period, label, budget, actual"),
    supabase.from("financial_statements").select("company_id, fiscal_year, code, amount"),
  ]);

  const companies = (coRes.data ?? []).filter((c) => (c.tracking_type ?? "equity") === "equity");
  const fins = finRes.data ?? [];
  const stmts = stmtRes.data ?? [];

  // Années disponibles (grille budgétaire + états financiers).
  const yearSet = new Set<number>();
  for (const f of fins) { const y = parseInt(String(f.period), 10); if (!Number.isNaN(y)) yearSet.add(y); }
  for (const s of stmts) yearSet.add(Number(s.fiscal_year));
  const years = [...yearSet].sort((a, b) => b - a);
  const Y = year ?? years[0] ?? new Date().getFullYear();

  // États financiers → CA (XB) et EBE (XD) calculés, par société et exercice.
  const byCompanyYear = new Map<string, Record<string, number>>();
  for (const s of stmts) {
    const k = `${s.company_id}|${s.fiscal_year}`;
    if (!byCompanyYear.has(k)) byCompanyYear.set(k, {});
    if (s.amount != null) byCompanyYear.get(k)![s.code as string] = Number(s.amount);
  }
  const fromStatements = (companyId: string, y: number) => {
    const raw = byCompanyYear.get(`${companyId}|${y}`);
    if (!raw || !Object.keys(raw).length) return null;
    const c = computeOhada(raw);
    return { ca: c.XB ?? null, ebe: c.XD ?? null };
  };

  // Grille Budget & BP → repli si les états financiers ne sont pas saisis.
  const fromGrid = (companyId: string, y: number, field: "budget" | "actual") => {
    const pick = (label: string) => {
      const row = fins.find((f) => f.company_id === companyId && String(f.period) === String(y) && f.label === label);
      const v = row ? row[field] : null;
      return v == null ? null : Number(v);
    };
    return { ca: pick(CA_LABEL), ebe: pick(EBE_LABEL) };
  };

  const actual = (companyId: string, y: number) => {
    const s = fromStatements(companyId, y);
    if (s && (s.ca != null || s.ebe != null)) return s;
    return fromGrid(companyId, y, "actual");
  };

  const rows: PerfRow[] = companies.map((c) => {
    const now = actual(c.id, Y);
    const prev = actual(c.id, Y - 1);
    const bud = fromGrid(c.id, Y, "budget");
    return {
      companyId: c.id, company: c.name,
      ca: now.ca, caPrev: prev.ca, caBudget: bud.ca,
      ebe: now.ebe, ebePrev: prev.ebe, ebeBudget: bud.ebe,
    };
  }).filter((r) => r.ca != null || r.ebe != null || r.caBudget != null);

  return { year: Y, years, rows };
}
