import { createClient } from "@/lib/supabase/server";

/** Valeurs saisies : { exercice: { codeOHADA: montant } }. */
export type StatementValues = Record<number, Record<string, number>>;

export async function getFinancialStatements(companyId: string): Promise<StatementValues> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financial_statements")
    .select("fiscal_year, code, amount")
    .eq("company_id", companyId);

  const out: StatementValues = {};
  for (const r of data ?? []) {
    const y = Number(r.fiscal_year);
    if (!out[y]) out[y] = {};
    if (r.amount != null) out[y][r.code as string] = Number(r.amount);
  }
  return out;
}
