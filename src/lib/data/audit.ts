import { createClient } from "@/lib/supabase/server";

// Réexport par commodité pour le code serveur ; les composants clients importent
// directement depuis "@/lib/audit-labels".
export { TABLE_LABEL, ACTION_LABEL, FIELD_LABEL } from "@/lib/audit-labels";

export type AuditChange = { avant: unknown; apres: unknown };
export type AuditEntry = {
  id: string; table: string; action: string; label: string | null; actor: string | null; at: string | null;
  /** Champs réellement modifiés, avec leur valeur avant et après. Null hors modification. */
  changes: Record<string, AuditChange> | null;
};



/** Journal complet (paginé) pour l'export — dépasse la limite Supabase de 1000 lignes. */
export async function getAuditForExport(): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const rows: { id: string; table_name: string; row_id: string | null; action: string; label: string | null; actor_id: string | null; at: string | null; changes: Record<string, AuditChange> | null }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase.from("audit_log").select("id, table_name, row_id, action, label, actor_id, at, changes").order("at", { ascending: false }).range(from, from + PAGE - 1);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
  const { data: profs } = actorIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds) : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const pMap = new Map((profs ?? []).map((p) => [p.id, p.full_name || p.email || "—"]));
  return rows.map((r) => ({ id: r.id, table: r.table_name, action: r.action, label: r.label, actor: r.actor_id ? pMap.get(r.actor_id) ?? "—" : "Système", at: r.at, changes: r.changes ?? null }));
}

export async function getAuditLog(limit = 120): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("audit_log").select("id, table_name, row_id, action, label, actor_id, at, changes").order("at", { ascending: false }).limit(limit);
  const rows = data ?? [];
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
  const { data: profs } = actorIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds) : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const pMap = new Map((profs ?? []).map((p) => [p.id, p.full_name || p.email || "—"]));
  return rows.map((r) => ({
    id: r.id, table: r.table_name, action: r.action, label: r.label,
    actor: r.actor_id ? pMap.get(r.actor_id) ?? "—" : "Système",
    at: r.at, changes: (r.changes as Record<string, AuditChange> | null) ?? null,
  }));
}
