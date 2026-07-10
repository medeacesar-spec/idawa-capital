import { createClient } from "@/lib/supabase/server";

export type TodoItem = { kind: string; label: string; sub: string; href: string; severity: "high" | "medium"; assigneeId: string | null };
export type TodoData = { items: TodoItem[]; total: number };

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

export async function getTodoItems(): Promise<TodoData> {
  const supabase = await createClient();
  const today = todayISO();

  const [coRes, dealRes, esgRes, taskRes, ddRes, vcRes] = await Promise.all([
    supabase.from("portfolio_companies").select("id, name"),
    supabase.from("deals").select("id, company_name"),
    supabase.from("esg_actions").select("entity_type, entity_id, action, date_end_plan, status, assignee_id").neq("status", "Réalisée"),
    supabase.from("tasks").select("entity_type, entity_id, title, due_date, status, assignee_id").neq("status", "Fait"),
    supabase.from("dd_items").select("entity_type, entity_id, item, status, assignee_id").eq("status", "Point d'attention"),
    supabase.from("value_creation").select("entity_type, entity_id, initiative, target_date, status, assignee_id"),
  ]);
  const coMap = new Map((coRes.data ?? []).map((c) => [c.id, c.name]));
  const dealMap = new Map((dealRes.data ?? []).map((d) => [d.id, d.company_name]));
  const nameOf = (t: string, id: string) => (t === "company" ? coMap.get(id) : dealMap.get(id)) ?? "—";
  const hrefOf = (t: string, id: string) => (t === "company" ? `/portefeuille/${id}` : `/pipeline/${id}`);

  const items: TodoItem[] = [];

  for (const a of esgRes.data ?? []) {
    if (a.date_end_plan && a.date_end_plan < today) {
      items.push({ kind: "ESG", label: a.action ?? "Action E&S", sub: `${nameOf(a.entity_type, a.entity_id)} · échéance dépassée`, href: hrefOf(a.entity_type, a.entity_id), severity: "high", assigneeId: a.assignee_id ?? null });
    }
  }
  for (const t of taskRes.data ?? []) {
    if (t.due_date && t.due_date < today) {
      items.push({ kind: "Action", label: t.title, sub: `${nameOf(t.entity_type, t.entity_id)} · échéance dépassée`, href: hrefOf(t.entity_type, t.entity_id), severity: "high", assigneeId: t.assignee_id ?? null });
    }
  }
  for (const d of ddRes.data ?? []) {
    items.push({ kind: "Due diligence", label: d.item, sub: `${nameOf(d.entity_type, d.entity_id)} · point d'attention`, href: hrefOf(d.entity_type, d.entity_id), severity: "high", assigneeId: d.assignee_id ?? null });
  }
  for (const v of vcRes.data ?? []) {
    if (v.target_date && v.target_date < today && v.status !== "Réalisée" && v.status !== "En pause") {
      items.push({ kind: "Création de valeur", label: v.initiative, sub: `${nameOf(v.entity_type, v.entity_id)} · échéance dépassée`, href: hrefOf(v.entity_type, v.entity_id), severity: "medium", assigneeId: v.assignee_id ?? null });
    }
  }

  items.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
  return { items, total: items.length };
}
