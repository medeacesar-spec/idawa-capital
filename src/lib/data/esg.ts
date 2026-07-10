import { createClient } from "@/lib/supabase/server";

export type EsgAssessment = { id: string; riskCategory: string | null; exclusionOk: boolean | null; ehsSector: string | null };
export type EsgAction = { id: string; category: string | null; action: string | null; responsibleCode: string | null; status: string | null; dateEndPlan: string | null; comment: string | null };
export type EsgImpact = { id: string; dimension: string | null; score: number | null; maxScore: number | null };
export type EsgData = { assessment: EsgAssessment | null; actions: EsgAction[]; impacts: EsgImpact[] };

export async function getEsg(entityType: "deal" | "company", entityId: string): Promise<EsgData> {
  const supabase = await createClient();
  const [aRes, actRes, impRes] = await Promise.all([
    supabase.from("esg_assessments").select("id, risk_category, exclusion_ok, ehs_sector").eq("entity_type", entityType).eq("entity_id", entityId).maybeSingle(),
    supabase.from("esg_actions").select("id, category, action, responsible_code, status, date_end_plan, comment").eq("entity_type", entityType).eq("entity_id", entityId).order("date_end_plan", { ascending: true }),
    supabase.from("esg_impact_ratings").select("id, dimension, score, max_score").eq("entity_type", entityType).eq("entity_id", entityId),
  ]);
  const a = aRes.data as { id: string; risk_category: string | null; exclusion_ok: boolean | null; ehs_sector: string | null } | null;
  return {
    assessment: a ? { id: a.id, riskCategory: a.risk_category, exclusionOk: a.exclusion_ok, ehsSector: a.ehs_sector } : null,
    actions: (actRes.data ?? []).map((x) => ({ id: x.id, category: x.category, action: x.action, responsibleCode: x.responsible_code, status: x.status, dateEndPlan: x.date_end_plan, comment: x.comment })),
    impacts: (impRes.data ?? []).map((x) => ({ id: x.id, dimension: x.dimension, score: x.score != null ? Number(x.score) : null, maxScore: x.max_score != null ? Number(x.max_score) : null })),
  };
}

export type EsgOverdue = { companyId: string; companyName: string; action: string | null; category: string | null; dateEndPlan: string | null; responsibleCode: string | null };
export type EsgOverview = {
  byRisk: { level: string; count: number }[];
  companiesRated: number;
  companiesTotal: number;
  actionsTotal: number;
  actionsDone: number;
  overdue: EsgOverdue[];
  impactScore: number;
  impactMax: number;
};

export async function getEsgOverview(): Promise<EsgOverview> {
  const supabase = await createClient();
  const [coRes, aRes, actRes, impRes] = await Promise.all([
    supabase.from("portfolio_companies").select("id, name"),
    supabase.from("esg_assessments").select("entity_id, risk_category").eq("entity_type", "company"),
    supabase.from("esg_actions").select("entity_id, action, category, status, date_end_plan, responsible_code").eq("entity_type", "company"),
    supabase.from("esg_impact_ratings").select("score, max_score").eq("entity_type", "company"),
  ]);
  const companies = coRes.data ?? [];
  const coMap = new Map(companies.map((c) => [c.id, c.name]));

  const assessments = aRes.data ?? [];
  const levels = ["A", "B", "C"];
  const byRisk = levels.map((level) => ({ level, count: assessments.filter((a) => a.risk_category === level).length }));
  const companiesRated = new Set(assessments.map((a) => a.entity_id)).size;

  const actions = actRes.data ?? [];
  const actionsTotal = actions.length;
  const actionsDone = actions.filter((a) => a.status === "Réalisée").length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue: EsgOverdue[] = actions
    .filter((a) => a.status !== "Réalisée" && a.date_end_plan && a.date_end_plan < today)
    .map((a) => ({ companyId: a.entity_id, companyName: coMap.get(a.entity_id) ?? "—", action: a.action, category: a.category, dateEndPlan: a.date_end_plan, responsibleCode: a.responsible_code }))
    .sort((x, y) => (x.dateEndPlan ?? "").localeCompare(y.dateEndPlan ?? ""));

  const impacts = impRes.data ?? [];
  const impactScore = impacts.reduce((s, i) => s + (i.score != null ? Number(i.score) : 0), 0);
  const impactMax = impacts.reduce((s, i) => s + (i.max_score != null ? Number(i.max_score) : 0), 0);

  return { byRisk, companiesRated, companiesTotal: companies.length, actionsTotal, actionsDone, overdue, impactScore, impactMax };
}
