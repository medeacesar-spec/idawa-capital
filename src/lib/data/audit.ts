import { createClient } from "@/lib/supabase/server";

export type AuditEntry = { id: string; table: string; action: string; label: string | null; actor: string | null; at: string | null };

export const TABLE_LABEL: Record<string, string> = {
  deals: "Dossier", portfolio_companies: "Participation", committee_passages: "Comité", esg_actions: "Action E&S",
  esg_assessments: "Diagnostic ESG", company_flows: "Flux / valorisation", company_financials: "Budget", company_captable: "Cap table",
  contacts: "Contact", partners: "Partenaire", tracked_kpis: "KPI", dd_items: "Due diligence", value_creation: "Création de valeur",
  documents: "Document", company_reporting: "Reporting", programs: "Programme",
};
export const ACTION_LABEL: Record<string, string> = { INSERT: "Création", UPDATE: "Modification", DELETE: "Suppression" };

export async function getAuditLog(limit = 120): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("audit_log").select("id, table_name, row_id, action, label, actor_id, at").order("at", { ascending: false }).limit(limit);
  const rows = data ?? [];
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
  const { data: profs } = actorIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds) : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const pMap = new Map((profs ?? []).map((p) => [p.id, p.full_name || p.email || "—"]));
  return rows.map((r) => ({
    id: r.id, table: r.table_name, action: r.action, label: r.label,
    actor: r.actor_id ? pMap.get(r.actor_id) ?? "—" : "Système",
    at: r.at,
  }));
}
