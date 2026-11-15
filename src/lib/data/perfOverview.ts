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
    // Seules les liasses des SOCIÉTÉS : celles des dossiers du pipeline n'entrent pas dans la performance.
    supabase.from("financial_statements").select("company_id, fiscal_year, code, amount").not("company_id", "is", null),
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

/** Vue « en cours d'année » : à partir des dépôts mensuels (dernier dépôt de l'exercice par société). */
export type YtdRow = {
  companyId: string; company: string; lastMonth: number;
  ca: number | null; caBudget: number | null; caPrev: number | null; caBudgetYear: number | null;
  treso: number | null; tresoBudget: number | null;
};
export type PerfYtd = { year: number; rows: YtdRow[] };

export async function getPerfYtd(year?: number): Promise<PerfYtd> {
  const supabase = await createClient();
  const Y = year ?? new Date().getFullYear();
  const { data: cos } = await supabase.from("portfolio_companies").select("id, name, tracking_type").order("name");
  const companies = (cos ?? []).filter((c) => (c.tracking_type ?? "equity") === "equity");
  const { data: deps } = await supabase.from("deposits").select("id, company_id, period, version").eq("kind", "mensuel")
    .or(`period.like.${Y}-M%,period.like.${Y - 1}-M%`);
  const best = new Map<string, { id: string; period: string; version: number }>();
  for (const d of deps ?? []) {
    const k = `${d.company_id}|${String(d.period).slice(0, 4)}`;
    const b = best.get(k);
    if (!b || d.period > b.period || (d.period === b.period && d.version > b.version)) best.set(k, { id: d.id as string, period: d.period as string, version: d.version as number });
  }
  const ids = [...best.values()].map((b) => b.id);
  const { data: lines } = ids.length
    ? await supabase.from("deposit_lines").select("deposit_id, code, vals").in("deposit_id", ids).in("code", ["CA_TOTAL", "BUD_CA_TOTAL", "TRESO_FIN", "BUD_TRESO_FIN"])
    : { data: [] };
  const val = (depId: string | undefined, code: string): (number | null)[] => {
    const l = (lines ?? []).find((x) => x.deposit_id === depId && x.code === code);
    return Array.from({ length: 12 }, (_, i) => { const v = (l?.vals as unknown[] | undefined)?.[i]; return typeof v === "number" ? v : null; });
  };
  const sum = (a: (number | null)[], n: number) => { const xs = a.slice(0, n).filter((x): x is number => x != null); return xs.length ? xs.reduce((s, x) => s + x, 0) : null; };
  const rows: YtdRow[] = [];
  for (const c of companies) {
    const cur = best.get(`${c.id}|${Y}`);
    if (!cur) continue;
    const prev = best.get(`${c.id}|${Y - 1}`);
    const ca = val(cur.id, "CA_TOTAL");
    let last = 0;
    ca.forEach((v, i) => { if (v != null && v !== 0) last = i + 1; });
    if (!last) continue;
    const bud = val(cur.id, "BUD_CA_TOTAL"), tf = val(cur.id, "TRESO_FIN"), btf = val(cur.id, "BUD_TRESO_FIN");
    rows.push({
      companyId: c.id as string, company: c.name as string, lastMonth: last,
      ca: sum(ca, last), caBudget: sum(bud, last), caBudgetYear: sum(bud, 12),
      caPrev: prev ? sum(val(prev.id, "CA_TOTAL"), last) : null,
      treso: tf[last - 1], tresoBudget: btf[last - 1],
    });
  }
  return { year: Y, rows };
}
