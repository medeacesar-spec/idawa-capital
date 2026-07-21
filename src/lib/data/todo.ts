import { createClient } from "@/lib/supabase/server";

export type TodoItem = {
  kind: string; label: string; sub: string; href: string;
  severity: "high" | "medium"; assigneeId: string | null; validation?: boolean;
  /** Échéance de l'action. « En retard » sans dire depuis quand n'aide pas à arbitrer. */
  dueDate: string | null;
};
export type TodoData = { items: TodoItem[]; total: number };

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

// Délai par défaut de validation d'un comité : 3 jours OUVRABLES après la proposition ;
// au-delà, la décision à valider est « en retard ».
function addBusinessDays(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}
const COMMITTEE_VALIDATION_BUSINESS_DAYS = 3;

export async function getTodoItems(): Promise<TodoData> {
  const supabase = await createClient();
  const today = todayISO();

  const [coRes, dealRes, esgRes, taskRes, ddRes, vcRes, comRes] = await Promise.all([
    supabase.from("portfolio_companies").select("id, name"),
    supabase.from("deals").select("id, company_name"),
    supabase.from("esg_actions").select("entity_type, entity_id, action, date_end_plan, status, assignee_id").neq("status", "Réalisée"),
    supabase.from("tasks").select("entity_type, entity_id, title, due_date, status, assignee_id").neq("status", "Fait"),
    supabase.from("dd_items").select("entity_type, entity_id, item, status, assignee_id, due_date"),
    supabase.from("value_creation").select("entity_type, entity_id, initiative, target_date, status, assignee_id"),
    supabase.from("committee_passages").select("id, deal_id, company_id, committee_type, decision, created_at").eq("status", "Proposée"),
  ]);
  const coMap = new Map((coRes.data ?? []).map((c) => [c.id, c.name]));
  const dealMap = new Map((dealRes.data ?? []).map((d) => [d.id, d.company_name]));
  const nameOf = (t: string, id: string) => (t === "company" ? coMap.get(id) : dealMap.get(id)) ?? "—";
  const hrefOf = (t: string, id: string) => (t === "company" ? `/portefeuille/${id}` : `/pipeline/${id}`);

  const items: TodoItem[] = [];
  // La to-do RAPPELLE les actions à prendre pour ÉVITER les retards : on liste les activités
  // ouvertes AVEC leur échéance (à venir comme en retard), pas seulement celles déjà dépassées.
  // Urgence : en retard = « high » (rouge), à venir = « medium ».
  const sev = (due: string): "high" | "medium" => (due < today ? "high" : "medium");

  for (const a of esgRes.data ?? []) {
    if (a.date_end_plan) {
      items.push({ kind: "ESG", label: a.action ?? "Action E&S", sub: nameOf(a.entity_type, a.entity_id), href: hrefOf(a.entity_type, a.entity_id), severity: sev(a.date_end_plan), assigneeId: a.assignee_id ?? null, dueDate: a.date_end_plan });
    }
  }
  for (const t of taskRes.data ?? []) {
    if (t.due_date) {
      items.push({ kind: "Action", label: t.title, sub: nameOf(t.entity_type, t.entity_id), href: hrefOf(t.entity_type, t.entity_id), severity: sev(t.due_date), assigneeId: t.assignee_id ?? null, dueDate: t.due_date });
    }
  }
  for (const d of ddRes.data ?? []) {
    if (d.status !== "Terminé" && d.due_date) {
      const flagged = d.status === "Point d'attention";
      items.push({ kind: "Due diligence", label: d.item, sub: `${nameOf(d.entity_type, d.entity_id)}${flagged ? " · point d'attention" : ""}`, href: hrefOf(d.entity_type, d.entity_id), severity: flagged ? "high" : sev(d.due_date), assigneeId: d.assignee_id ?? null, dueDate: d.due_date });
    }
  }
  for (const v of vcRes.data ?? []) {
    if (v.target_date && v.status !== "Réalisée" && v.status !== "En pause") {
      items.push({ kind: "Création de valeur", label: v.initiative, sub: nameOf(v.entity_type, v.entity_id), href: hrefOf(v.entity_type, v.entity_id), severity: sev(v.target_date), assigneeId: v.assignee_id ?? null, dueDate: v.target_date });
    }
  }

  // Décisions à valider — pipeline ET portefeuille (un passage porte soit deal_id, soit company_id).
  // Elles remontent DÈS la proposition, avec le délai par défaut de 3 jours ouvrables comme
  // échéance ; au-delà elles passent « en retard ». Objectif : valider dans les temps.
  for (const c of comRes.data ?? []) {
    const deadline = c.created_at ? addBusinessDays(c.created_at, COMMITTEE_VALIDATION_BUSINESS_DAYS) : today;
    const isCompany = !!c.company_id;
    const entityName = isCompany ? (coMap.get(c.company_id) ?? "—") : (dealMap.get(c.deal_id) ?? "—");
    const href = isCompany ? `/portefeuille/${c.company_id}` : (c.deal_id ? `/pipeline/${c.deal_id}` : "/pipeline");
    items.push({ kind: "Comité", label: `${c.committee_type} — décision à valider`, sub: `${entityName}${c.decision ? ` · ${c.decision}` : ""}`, href, severity: deadline < today ? "high" : "medium", assigneeId: null, validation: true, dueDate: deadline });
  }

  // À gravité égale, le plus ancien retard passe devant : c'est celui qui coûte le plus.
  items.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
  });
  return { items, total: items.length };
}
