import { createClient } from "@/lib/supabase/server";

export type DdItem = { id: string; domain: string; item: string; status: string; note: string | null; assigneeId: string | null; createdAt: string | null };
export type ValueInitiative = { id: string; lever: string | null; initiative: string; owner: string | null; status: string; targetDate: string | null; impact: string | null; assigneeId: string | null; createdAt: string | null };

export async function getDdItems(entityType: "deal" | "company", entityId: string): Promise<DdItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("dd_items").select("id, domain, item, status, note, assignee_id, created_at").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at");
  return (data ?? []).map((x) => ({ id: x.id, domain: x.domain, item: x.item, status: x.status, note: x.note, assigneeId: x.assignee_id, createdAt: x.created_at ?? null }));
}

export async function getValueCreation(entityType: "deal" | "company", entityId: string): Promise<ValueInitiative[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("value_creation").select("id, lever, initiative, owner, status, target_date, impact, assignee_id, created_at").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at");
  return (data ?? []).map((x) => ({ id: x.id, lever: x.lever, initiative: x.initiative, owner: x.owner, status: x.status, targetDate: x.target_date, impact: x.impact, assigneeId: x.assignee_id, createdAt: x.created_at ?? null }));
}
