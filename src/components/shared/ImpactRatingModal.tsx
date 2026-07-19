"use client";

// Notation d'impact IPDEV 2 : on déroule la grille d'I&P, critère par critère, et le
// total se calcule. Avant, il fallait ouvrir le classeur ailleurs, compter à la main,
// puis reporter un score et son maximum — exactement la double saisie qu'on supprime
// partout ailleurs dans l'application.
//
// ENREGISTREMENT SANS MIGRATION : la table `esg_impact_ratings` porte une ligne par
// dimension (score, max_score). Le détail des réponses est rangé dans sa colonne `note`,
// au format JSON, ce qui permet de rouvrir la grille telle qu'elle a été remplie sans
// toucher au schéma pendant la période de tests. Le jour où une table dédiée existera,
// `decodeAnswers` restera le seul point à déplacer.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import {
  IMPACT_DIMENSIONS, BONUS_CRITERIA, BONUS_LABEL, BASE_MAX,
  dimensionScore, baseScore, bonusScore, answeredCount, noteOnThree,
  encodeAnswers, decodeAnswers,
  type Answers, type Criterion,
} from "@/lib/esg/impactRating";
import type { EsgImpact } from "@/lib/data/esg";

function CriterionRow({ c, value, onChange }: { c: Criterion; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div style={{ padding: "9px 0", borderBottom: "1px solid var(--sep)" }}>
      <div style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 500 }}>{c.label}</div>
      {c.help && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{c.help}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
        {c.choices.map((ch) => {
          const on = value === ch.score;
          return (
            <button key={ch.score} type="button" onClick={() => onChange(ch.score)}
              style={{
                display: "flex", alignItems: "center", gap: 7, textAlign: "left",
                padding: "5px 10px", borderRadius: 999, cursor: "pointer", fontSize: 11.5,
                border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}`,
                background: on ? "var(--espresso)" : "var(--surface)",
                color: on ? "#fff" : "var(--text-2)",
              }}>
              <span className="tnum" style={{ fontWeight: 700 }}>{ch.score > 0 ? `+${ch.score}` : ch.score}</span>
              <span>{ch.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ImpactRatingModal({
  entityType, entityId, impacts, onClose,
}: {
  entityType: "deal" | "company";
  entityId: string;
  impacts: EsgImpact[];
  onClose: () => void;
}) {
  const router = useRouter();

  // Les réponses sont reconstituées depuis les notes des lignes déjà enregistrées.
  const initial = useMemo(() => {
    const a: Answers = {};
    for (const im of impacts) Object.assign(a, decodeAnswers(im.note));
    return a;
  }, [impacts]);

  const [answers, setAnswers] = useState<Answers>(initial);
  const [busy, setBusy] = useState(false);
  const set = (key: string, v: number) => setAnswers((a) => ({ ...a, [key]: v }));

  const base = baseScore(answers);
  const bonus = bonusScore(answers);
  const { answered, total } = answeredCount(answers);

  async function save() {
    setBusy(true);
    const supabase = createClient();
    const detail = encodeAnswers(answers);

    // Une ligne par dimension, plus une ligne « Bonus » dont le maximum est nul :
    // les bonus s'ajoutent au score sans relever le total de référence de 32.
    const rows = [
      ...IMPACT_DIMENSIONS.map((d) => ({
        dimension: d.label,
        score: dimensionScore(d, answers),
        max_score: d.max,
      })),
      { dimension: BONUS_LABEL, score: bonus, max_score: 0 },
    ];

    for (const r of rows) {
      const existing = impacts.find((im) => im.dimension === r.dimension);
      const payload = { entity_type: entityType, entity_id: entityId, ...r, note: detail };
      if (existing) await supabase.from("esg_impact_ratings").update(payload).eq("id", existing.id);
      else await supabase.from("esg_impact_ratings").insert(payload);
    }

    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal title="Rating d'impact IPDEV 2" onClose={onClose} maxWidth={780}>
      <div style={{ fontSize: 11.5, color: "var(--text-2)", marginBottom: 12, lineHeight: 1.6 }}>
        Grille reprise de l&apos;outil d&apos;analyse ESG d&apos;I&amp;P. Le total se calcule ;
        les bonus s&apos;ajoutent par-dessus les {BASE_MAX} points et ne relèvent pas le maximum.
      </div>

      {/* Total, toujours visible pendant la saisie */}
      <div style={{
        position: "sticky", top: 0, zIndex: 2, background: "var(--surface-cream)",
        border: "1px solid var(--border-strong)", borderRadius: 11, padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 14,
      }}>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--text-2)" }}>Note d&apos;impact</div>
          <div className="serif tnum" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>
            {base} <span style={{ fontSize: 13, color: "var(--text-3)" }}>/ {BASE_MAX}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--text-2)" }}>Bonus</div>
          <div className="serif tnum" style={{ fontSize: 18, fontWeight: 600, color: bonus < 0 ? "var(--red-fg)" : "var(--ink)" }}>
            {bonus > 0 ? `+${bonus}` : bonus}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--text-2)" }}>Note pour le comité</div>
          <div className="serif tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{noteOnThree(base)} / 3</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: answered === total ? "var(--green-fg)" : "var(--amber-fg)" }}>
          {answered} / {total} critères renseignés
        </div>
      </div>

      {IMPACT_DIMENSIONS.map((d) => (
        <section key={d.key} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, borderBottom: "1px solid var(--border-strong)", paddingBottom: 5 }}>
            <div>
              <span className="serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{d.label}</span>
              <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 8 }}>{d.objective}</span>
            </div>
            <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
              {dimensionScore(d, answers)} / {d.max}
            </span>
          </div>
          {d.criteria.map((c) => (
            <CriterionRow key={c.key} c={c} value={answers[c.key]} onChange={(v) => set(c.key, v)} />
          ))}
        </section>
      ))}

      <section style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, borderBottom: "1px solid var(--border-strong)", paddingBottom: 5 }}>
          <div>
            <span className="serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Bonus et malus</span>
            <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 8 }}>hors note sur {BASE_MAX}</span>
          </div>
          <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{bonus > 0 ? `+${bonus}` : bonus}</span>
        </div>
        {BONUS_CRITERIA.map((c) => (
          <CriterionRow key={c.key} c={c} value={answers[c.key]} onChange={(v) => set(c.key, v)} />
        ))}
      </section>

      <div style={{ padding: "10px 12px", background: "var(--amber-bg)", borderRadius: 9, fontSize: 11, color: "var(--amber-fg)", marginBottom: 14 }}>
        <strong>Dimension genre</strong> — l&apos;outil source la mentionne (emplois, top management,
        bonus produits destinés aux femmes) mais renvoie au référentiel IPAE sans en donner le barème.
        Elle n&apos;est donc pas notée ici tant que ce barème n&apos;est pas arbitré.
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Annuler</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer la notation"}
        </button>
      </div>
    </Modal>
  );
}
