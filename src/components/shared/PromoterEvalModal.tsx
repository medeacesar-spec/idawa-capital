"use client";

// Évaluation du promoteur — « on investit d'abord dans une personne » (doctrine I&P).
// 5 critères notés 0–4, chacun avec sa justification, plus une appréciation générale et
// une note de synthèse du comité sur 3 (aligné sur la notation d'impact IPDEV).
//
// ENREGISTREMENT : tout tient dans la colonne jsonb `promoter_eval` de l'entité
// (deals ou portfolio_companies) — pas de table dédiée, la grille se rouvre telle quelle.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { Field, Textarea, Select } from "@/components/ui/form";
import { PROMOTER_CRITERIA, PROMOTER_SCORE_MAX, PROMOTER_COMMITTEE_NOTES } from "@/lib/ui-constants";

export type PromoterEval = {
  scores: Record<string, number>;
  notes: Record<string, string>;
  appreciation: string;
  committeeNote: number | null;
};

export function emptyEval(): PromoterEval {
  return { scores: {}, notes: {}, appreciation: "", committeeNote: null };
}
export function evalTotal(e: PromoterEval | null): { total: number; answered: number } {
  if (!e) return { total: 0, answered: 0 };
  const keys = PROMOTER_CRITERIA.filter((c) => e.scores[c.key] != null);
  return { total: keys.reduce((s, c) => s + (e.scores[c.key] ?? 0), 0), answered: keys.length };
}
export const PROMOTER_TOTAL_MAX = PROMOTER_CRITERIA.length * PROMOTER_SCORE_MAX;

export default function PromoterEvalModal({
  table, entityId, initial, onClose,
}: {
  table: "deals" | "portfolio_companies";
  entityId: string;
  initial: PromoterEval | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [ev, setEv] = useState<PromoterEval>(initial ?? emptyEval());

  const setScore = (k: string, v: number) => setEv((p) => ({ ...p, scores: { ...p.scores, [k]: v } }));
  const setNote = (k: string, v: string) => setEv((p) => ({ ...p, notes: { ...p.notes, [k]: v } }));

  const { total, answered } = evalTotal(ev);

  async function save() {
    setBusy(true);
    await createClient().from(table).update({ promoter_eval: ev }).eq("id", entityId);
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal title="Évaluation du promoteur" onClose={onClose} maxWidth={760}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Annuler</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer l'évaluation"}</button>
      </>}>
      <div style={{ fontSize: 11.5, color: "var(--text-2)", marginBottom: 12, lineHeight: 1.6 }}>
        Chaque critère est noté de 0 à 4. Le commentaire compte autant que la note : il justifie le jugement.
      </div>

      {/* Total, visible pendant la saisie */}
      <div style={{
        position: "sticky", top: 0, zIndex: 2, background: "var(--surface-cream)",
        border: "1px solid var(--border-strong)", borderRadius: 11, padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 14,
      }}>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--text-2)" }}>Note du promoteur</div>
          <div className="serif tnum" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>
            {total} <span style={{ fontSize: 13, color: "var(--text-3)" }}>/ {PROMOTER_TOTAL_MAX}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--text-2)" }}>Synthèse comité</div>
          <div className="serif tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>
            {ev.committeeNote != null ? `${ev.committeeNote} / 3` : "—"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: answered === PROMOTER_CRITERIA.length ? "var(--green-fg)" : "var(--amber-fg)" }}>
          {answered} / {PROMOTER_CRITERIA.length} critères renseignés
        </div>
      </div>

      {PROMOTER_CRITERIA.map((c) => (
        <div key={c.key} style={{ padding: "12px 0", borderBottom: "1px solid var(--sep)" }}>
          <div style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600 }}>{c.label}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{c.help}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
            {Array.from({ length: PROMOTER_SCORE_MAX + 1 }, (_, n) => {
              const on = ev.scores[c.key] === n;
              return (
                <button key={n} type="button" onClick={() => setScore(c.key, n)}
                  style={{
                    minWidth: 34, padding: "5px 10px", borderRadius: 999, cursor: "pointer", fontSize: 12,
                    border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}`,
                    background: on ? "var(--espresso)" : "var(--surface)",
                    color: on ? "#fff" : "var(--text-2)", fontWeight: 700,
                  }}>{n}</button>
              );
            })}
          </div>
          <Textarea rows={2} value={ev.notes[c.key] ?? ""} onChange={(e) => setNote(c.key, e.target.value)}
            placeholder="Justification, exemples concrets…" />
        </div>
      ))}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <Field label="Appréciation générale">
          <Textarea rows={3} value={ev.appreciation} onChange={(e) => setEv((p) => ({ ...p, appreciation: e.target.value }))}
            placeholder="Lecture d'ensemble du promoteur : forces, points de vigilance, conditions d'accompagnement…" />
        </Field>
        <Field label="Note de synthèse du comité">
          <Select value={ev.committeeNote != null ? String(ev.committeeNote) : ""}
            onChange={(e) => setEv((p) => ({ ...p, committeeNote: e.target.value === "" ? null : Number(e.target.value) }))}>
            <option value="">—</option>
            {PROMOTER_COMMITTEE_NOTES.map((n) => <option key={n.v} value={n.v}>{n.label}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
