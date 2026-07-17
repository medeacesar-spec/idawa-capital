import { createClient } from "@/lib/supabase/server";

export type SuiviNote = { id: string; type: string | null; noteDate: string | null; participants: string | null; summary: string | null };
export type SuiviTask = { id: string; title: string; assigneeLabel: string | null; assigneeId: string | null; dueDate: string | null; status: string | null; createdAt: string | null };
export type SuiviData = { notes: SuiviNote[]; tasks: SuiviTask[] };

export async function getSuivi(entityType: "deal" | "company", entityId: string): Promise<SuiviData> {
  const supabase = await createClient();
  const [nRes, tRes] = await Promise.all([
    supabase.from("notes").select("id, type, note_date, participants, summary").eq("entity_type", entityType).eq("entity_id", entityId).order("note_date", { ascending: false }),
    supabase.from("tasks").select("id, title, assignee_label, assignee_id, due_date, status, created_at").eq("entity_type", entityType).eq("entity_id", entityId).order("due_date", { ascending: true }),
  ]);
  return {
    notes: (nRes.data ?? []).map((n) => ({ id: n.id, type: n.type, noteDate: n.note_date, participants: n.participants, summary: n.summary })),
    tasks: (tRes.data ?? []).map((t) => ({ id: t.id, title: t.title, assigneeLabel: t.assignee_label, assigneeId: t.assignee_id, dueDate: t.due_date, status: t.status, createdAt: t.created_at ?? null })),
  };
}
