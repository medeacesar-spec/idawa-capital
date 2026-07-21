import { createClient } from "@/lib/supabase/client";

// Journalisation d'un changement d'échéance dans le journal du Suivi de l'entité.
// Toute activité datée (action de suivi, action ESG, point de due diligence, initiative
// de création de valeur) passe par ici quand son échéance bouge, pour laisser une trace
// datée immédiate — module client-safe (aucun import serveur).

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function fr(d: string) { return `${d.slice(8, 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`; }
export function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

/** Écrit une note datée « Échéance <kind> « <label> » modifiée/définie … » dans le Suivi. */
export async function logDueChange(opts: {
  entityType: "deal" | "company"; entityId: string;
  kind: string; label: string; oldDue: string | null; newDue: string; reason?: string;
}) {
  const msg = opts.oldDue
    ? `Échéance ${opts.kind} « ${opts.label} » modifiée : ${fr(opts.oldDue)} → ${fr(opts.newDue)}${opts.reason && opts.reason.trim() ? ` — ${opts.reason.trim()}` : ""}.`
    : `Échéance ${opts.kind} « ${opts.label} » définie : ${fr(opts.newDue)}.`;
  await createClient().from("notes").insert({
    entity_type: opts.entityType, entity_id: opts.entityId,
    type: "Note", note_date: todayISO(), participants: null, summary: msg,
  });
}
