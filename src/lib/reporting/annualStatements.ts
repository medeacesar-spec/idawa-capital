// Dépôt annuel (classeur « Analyses EF ») → états financiers de la fiche entreprise. SERVEUR UNIQUEMENT.
//
// Le classeur suit la convention de Saint-André : charges (lignes R…) et capital non appelé (CB) en
// NÉGATIF. L'ERP saisit les charges en POSITIF : on retourne leur signe. Seules les lignes de saisie
// de l'ERP sont reprises (les totaux se recalculent), et le résultat recalculé est rapproché de
// celui du classeur.
//
// Règle d'origine : un exercice saisi par l'équipe n'est jamais écrasé ; un exercice repris d'un
// dépôt est mis à jour par le dépôt suivant ; un exercice vide est rempli.

import type { SupabaseClient } from "@supabase/supabase-js";
import { OHADA_ACTIF, OHADA_PASSIF, OHADA_RESULTAT, computeOhada } from "@/lib/finance/ohada";
import type { Line } from "@/lib/reporting/deposit";

const INPUT = new Set([...OHADA_ACTIF, ...OHADA_PASSIF, ...OHADA_RESULTAT].filter((l) => l.kind === "input").map((l) => l.code));
const flip = (code: string) => code.startsWith("R") || code === "CB";

export type YearOutcome = { year: number; action: "rempli" | "mis à jour" | "conservé (saisi par l'équipe)"; differences: number; resultGap: number | null };

/** Montants de saisie par exercice, convention ERP, à partir des lignes EF_ de la Synthèse annuelle. */
export function statementsFromLines(lines: Line[], lastYear: number): Record<number, Record<string, number>> {
  const out: Record<number, Record<string, number>> = {};
  for (const l of lines) {
    if (!l.code.startsWith("EF_")) continue;
    const code = l.code.slice(3);
    if (!INPUT.has(code)) continue;
    l.values.forEach((v, i) => {
      if (typeof v !== "number") return;
      const y = lastYear - (l.values.length - 1) + i;
      (out[y] ??= {})[code] = flip(code) ? -v : v;
    });
  }
  for (const y of Object.keys(out)) if (!Object.values(out[+y]).some((x) => x !== 0)) delete out[+y];
  return out;
}

export async function applyAnnualDeposit(admin: SupabaseClient, companyId: string, depositId: string, lastYear: number, lines: Line[]): Promise<YearOutcome[]> {
  const byYear = statementsFromLines(lines, lastYear);
  const xiOf = (y: number) => {
    const l = lines.find((x) => x.code === "RESULTAT_NET");
    const v = l?.values[l.values.length - 1 - (lastYear - y)];
    return typeof v === "number" ? v : null;
  };
  const outcomes: YearOutcome[] = [];
  for (const [ys, values] of Object.entries(byYear)) {
    const year = Number(ys);
    const rows = Object.entries(values).map(([code, amount]) => ({ company_id: companyId, fiscal_year: year, code, amount, deposit_id: depositId }));
    await admin.from("deposit_statements").delete().eq("company_id", companyId).eq("fiscal_year", year);
    if (rows.length) await admin.from("deposit_statements").insert(rows);

    const [{ data: origin }, { data: current }] = await Promise.all([
      admin.from("financial_statement_origin").select("origin").eq("company_id", companyId).eq("fiscal_year", year).maybeSingle(),
      admin.from("financial_statements").select("code, amount").eq("company_id", companyId).eq("fiscal_year", year),
    ]);
    const cur: Record<string, number> = {};
    for (const r of current ?? []) if (r.amount != null) cur[r.code as string] = Number(r.amount);
    const differences = [...new Set([...Object.keys(cur), ...Object.keys(values)])].filter((c) => INPUT.has(c) && Math.abs((cur[c] ?? 0) - (values[c] ?? 0)) >= 1).length;

    let action: YearOutcome["action"];
    if (origin?.origin === "saisie" || (!origin && Object.keys(cur).length)) {
      action = "conservé (saisi par l'équipe)";
      if (!origin) await admin.from("financial_statement_origin").insert({ company_id: companyId, fiscal_year: year, origin: "saisie" });
    } else {
      action = origin ? "mis à jour" : "rempli";
      await admin.from("financial_statements").delete().eq("company_id", companyId).eq("fiscal_year", year);
      await admin.from("financial_statements").insert(rows.map((r) => ({ company_id: r.company_id, fiscal_year: r.fiscal_year, code: r.code, amount: r.amount })));
      await admin.from("financial_statement_origin").upsert({ company_id: companyId, fiscal_year: year, origin: "depot", deposit_id: depositId, updated_at: new Date().toISOString() });
    }
    const xi = computeOhada(values).XI ?? null, dep = xiOf(year);
    outcomes.push({ year, action, differences: action.startsWith("conservé") ? differences : 0, resultGap: xi != null && dep != null && Math.abs(xi - dep) >= 1 ? xi - dep : null });
  }
  return outcomes.sort((a, b) => a.year - b.year);
}

/** L'équipe adopte la version déposée d'un exercice (remplace la saisie). */
export async function adoptDeposited(admin: SupabaseClient, companyId: string, year: number) {
  const { data: dep } = await admin.from("deposit_statements").select("code, amount, deposit_id").eq("company_id", companyId).eq("fiscal_year", year);
  if (!dep?.length) return { error: "Aucune version déposée pour cet exercice." };
  await admin.from("financial_statements").delete().eq("company_id", companyId).eq("fiscal_year", year);
  await admin.from("financial_statements").insert(dep.map((r) => ({ company_id: companyId, fiscal_year: year, code: r.code, amount: r.amount })));
  await admin.from("financial_statement_origin").upsert({ company_id: companyId, fiscal_year: year, origin: "depot", deposit_id: dep[0].deposit_id, updated_at: new Date().toISOString() });
  return { ok: true };
}
