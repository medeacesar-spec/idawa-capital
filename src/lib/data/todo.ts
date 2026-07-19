import { createClient } from "@/lib/supabase/server";

export type TodoItem = {
  kind: string; label: string; sub: string; href: string;
  severity: "high" | "medium"; assigneeId: string | null; validation?: boolean;
  /** Échéance de l'action. « En retard » sans dire depuis quand n'aide pas à arbitrer. */
  dueDate: string | null;
};
export type TodoData = { items: TodoItem[]; total: number };

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

export async function getTodoItems(): Promise<TodoData> {
  const supabase = await createClient();
  const today = todayISO();

  const [coRes, dealRes, esgRes, taskRes, ddRes, vcRes, comRes] = await Promise.all([
    supabase.from("portfolio_companies").select("id, name"),
    supabase.from("deals").select("id, company_name"),
    supabase.from("esg_actions").select("entity_type, entity_id, action, date_end_plan, status, assignee_id").neq("status", "Réalisée"),
    supabase.from("tasks").select("entity_type, entity_id, title, due_date, status, assignee_id").neq("status", "Fait"),
    supabase.from("dd_items").select("entity_type, entity_id, item, status, assignee_id").eq("status", "Point d'attention"),
    supabase.from("value_creation").select("entity_type, entity_id, initiative, target_date, status, assignee_id"),
    supabase.from("committee_passages").select("id, deal_id, company_id, committee_type, decision").eq("status", "Proposée"),
  ]);
  const coMap = new Map((coRes.data ?? []).map((c) => [c.id, c.name]));
  const dealMap = new Map((dealRes.data ?? []).map((d) => [d.id, d.company_name]));
  const nameOf = (t: string, id: string) => (t === "company" ? coMap.get(id) : dealMap.get(id)) ?? "—";
  const hrefOf = (t: string, id: string) => (t === "company" ? `/portefeuille/${id}` : `/pipeline/${id}`);

  const items: TodoItem[] = [];

  for (const a of esgRes.data ?? []) {
    if (a.date_end_plan && a.date_end_plan < today) {
      items.push({ kind: "ESG", label: a.action ?? "Action E&S", sub: nameOf(a.entity_type, a.entity_id), href: hrefOf(a.entity_type, a.entity_id), severity: "high", assigneeId: a.assignee_id ?? null, dueDate: a.date_end_plan });
    }
  }
  for (const t of taskRes.data ?? []) {
    if (t.due_date && t.due_date < today) {
      items.push({ kind: "Action", label: t.title, sub: nameOf(t.entity_type, t.entity_id), href: hrefOf(t.entity_type, t.entity_id), severity: "high", assigneeId: t.assignee_id ?? null, dueDate: t.due_date });
    }
  }
  for (const d of ddRes.data ?? []) {
    items.push({ kind: "Due diligence", label: d.item, sub: `${nameOf(d.entity_type, d.entity_id)} · point d'attention`, href: hrefOf(d.entity_type, d.entity_id), severity: "high", assigneeId: d.assignee_id ?? null, dueDate: null });
  }
  for (const v of vcRes.data ?? []) {
    if (v.target_date && v.target_date < today && v.status !== "Réalisée" && v.status !== "En pause") {
      items.push({ kind: "Création de valeur", label: v.initiative, sub: nameOf(v.entity_type, v.entity_id), href: hrefOf(v.entity_type, v.entity_id), severity: "medium", assigneeId: v.assignee_id ?? null, dueDate: v.target_date });
    }
  }

  // Décisions à valider — pipeline ET portefeuille (un passage porte soit deal_id, soit company_id).
  for (const c of comRes.data ?? []) {
    const isCompany = !!c.company_id;
    const entityName = isCompany ? (coMap.get(c.company_id) ?? "—") : (dealMap.get(c.deal_id) ?? "—");
    const href = isCompany ? `/portefeuille/${c.company_id}` : (c.deal_id ? `/pipeline/${c.deal_id}` : "/pipeline");
    items.push({ kind: "Comité", label: `${c.committee_type} — décision à valider`, sub: `${entityName}${c.decision ? ` · ${c.decision}` : ""}`, href, severity: "high", assigneeId: null, validation: true, dueDate: null });
  }

  // À gravité égale, le plus ancien retard passe devant : c'est celui qui coûte le plus.
  items.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
  });
  return { items, total: items.length };
}
