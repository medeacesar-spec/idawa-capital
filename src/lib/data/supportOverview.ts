// Vue consolidée de l'accélération, tous programmes confondus.
//
// La page Performance ne parlait que des participations : multiples, TRI, valorisations.
// La moitié accélération du métier n'avait aucune vue d'ensemble — impossible de dire, en
// un écran, combien d'entreprises sont suivies, ce qui a été décaissé, ni ce que
// l'accompagnement a produit.

import { createClient } from "@/lib/supabase/server";

export type SupportIndicatorTotal = {
  name: string;
  unit: string | null;
  scope: string;
  /** Dernière période renseignée pour cet indicateur, tous programmes confondus. */
  period: string | null;
  value: number;
  target: number | null;
};

export type SupportProgram = {
  id: string;
  name: string;
  color: string | null;
  nature: string;
  companies: number;
  indicators: SupportIndicatorTotal[];
};

export type SupportOverview = {
  programs: SupportProgram[];
  totalCompanies: number;
  budget: number;
  disbursed: number;
  /** Part du budget effectivement décaissée, tous programmes confondus. */
  executionRate: number | null;
};

const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function getSupportOverview(): Promise<SupportOverview> {
  const supabase = await createClient();

  const [progRes, coRes, indRes, pvRes, cvRes] = await Promise.all([
    supabase.from("programs").select("id, name, color, nature, status, position").order("position"),
    supabase.from("portfolio_companies").select("id, program_id, tracking_type, status"),
    supabase.from("program_indicators").select("id, program_id, name, unit, scope, target"),
    supabase.from("program_indicator_values").select("program_indicator_id, period, value"),
    supabase.from("company_indicator_values").select("company_id, program_indicator_id, period, value"),
  ]);

  // Seuls les programmes qui accompagnent : un programme purement d'investissement n'a
  // rien à faire ici, et un programme clos ne se pilote plus.
  const programs = (progRes.data ?? []).filter(
    (p) => p.status !== "Clos" && (p.nature === "accompagnement" || p.nature === "mixte")
  );
  const companies = (coRes.data ?? []).filter((c) => c.status !== "Sorti" && c.status !== "Radié");
  const indicators = indRes.data ?? [];
  const progValues = pvRes.data ?? [];
  const compValues = cvRes.data ?? [];

  const programOfCompany = new Map(companies.map((c) => [c.id as string, c.program_id as string | null]));
  // Une entreprise est « accompagnée » si elle est suivie à ce titre, ou si on a déjà
  // consigné quelque chose pour elle : dans un programme mixte, une participation peut
  // aussi être accompagnée.
  const withSupport = new Set(compValues.map((v) => v.company_id as string));
  const isSupported = (c: { id: string; tracking_type?: string | null }) =>
    (c.tracking_type ?? "equity") === "accompagnement" || withSupport.has(c.id);

  const out: SupportProgram[] = programs.map((p) => {
    const mine = companies.filter((c) => c.program_id === p.id);

    const totals: SupportIndicatorTotal[] = indicators
      .filter((i) => i.program_id === p.id)
      .map((i) => {
        const base = {
          name: i.name as string,
          unit: (i.unit as string) ?? null,
          scope: (i.scope as string) ?? "entreprise",
          target: i.target != null ? Number(i.target) : null,
        };
        // Chaque indicateur suit sa propre dernière période : une saisie plus récente
        // ailleurs ne doit pas faire disparaître les autres.
        if (base.scope === "entreprise") {
          const rows = compValues.filter(
            (v) => v.program_indicator_id === i.id && programOfCompany.get(v.company_id as string) === p.id
          );
          if (rows.length === 0) return { ...base, period: null, value: 0 };
          const period = rows.map((v) => v.period as string).sort((a, b) => b.localeCompare(a))[0];
          return { ...base, period, value: rows.filter((v) => v.period === period).reduce((a, v) => a + num(v.value), 0) };
        }
        const rows = progValues.filter((v) => v.program_indicator_id === i.id);
        if (rows.length === 0) return { ...base, period: null, value: 0 };
        const last = [...rows].sort((a, b) => (b.period as string).localeCompare(a.period as string))[0];
        return { ...base, period: last.period as string, value: num(last.value) };
      })
      .filter((t) => t.period !== null);

    return {
      id: p.id as string,
      name: p.name as string,
      color: (p.color as string) ?? null,
      nature: p.nature as string,
      companies: mine.filter(isSupported).length,
      indicators: totals,
    };
  });

  const pick = (prog: SupportProgram, label: string) =>
    prog.indicators.find((i) => i.name === label)?.value ?? 0;
  const budget = out.reduce((a, p) => a + pick(p, "Budget alloué"), 0);
  const disbursed = out.reduce((a, p) => a + pick(p, "Montant décaissé"), 0);

  return {
    programs: out,
    totalCompanies: out.reduce((a, p) => a + p.companies, 0),
    budget,
    disbursed,
    executionRate: budget > 0 ? disbursed / budget : null,
  };
}
