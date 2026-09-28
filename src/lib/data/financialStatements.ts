import { createClient } from "@/lib/supabase/server";

/** Valeurs saisies : { exercice: { codeOHADA: montant } }. */
export type StatementValues = Record<number, Record<string, number>>;

/** Propriétaire des états financiers : un dossier du pipeline ou une société du portefeuille. */
export type FinEntity = { type: "deal" | "company"; id: string };

/** Chiffres clés d'un exercice, tels que déclarés par une source (hors liasse). */
export type KeyFigure = {
  fiscalYear: number;
  revenue: number | null;
  ebitda: number | null;
  netIncome: number | null;
  employees: number | null;
  source: string | null;
  note: string | null;
};

export async function getFinancialStatements(entity: FinEntity): Promise<StatementValues> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financial_statements")
    .select("fiscal_year, code, amount")
    .eq(entity.type === "deal" ? "deal_id" : "company_id", entity.id);

  const out: StatementValues = {};
  for (const r of data ?? []) {
    const y = Number(r.fiscal_year);
    if (!out[y]) out[y] = {};
    if (r.amount != null) out[y][r.code as string] = Number(r.amount);
  }
  return out;
}

const num = (v: unknown) => (v == null ? null : Number(v));

export async function getKeyFigures(entity: FinEntity): Promise<KeyFigure[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("key_figures")
    .select("fiscal_year, revenue, ebitda, net_income, employees, source, note")
    .eq("entity_type", entity.type).eq("entity_id", entity.id)
    .order("fiscal_year", { ascending: false });
  return (data ?? []).map((r) => ({
    fiscalYear: Number(r.fiscal_year),
    revenue: num(r.revenue), ebitda: num(r.ebitda), netIncome: num(r.net_income),
    employees: r.employees == null ? null : Number(r.employees),
    source: r.source ?? null, note: r.note ?? null,
  }));
}
