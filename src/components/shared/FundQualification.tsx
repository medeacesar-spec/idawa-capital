"use client";

// Rattachement d'une fiche à un fonds, à côté de ses programmes.
// Par défaut, un dossier est dans le PIPELINE NON QUALIFIÉ (aucun fonds) ; on le « qualifie »
// pour un fonds quand l'équipe le suit vraiment pour ce fonds. Fonds et programme se cumulent :
// une entreprise peut être suivie pour Fonds I ET dans Catal1.5°T.
// Chaque changement laisse une note datée au Suivi.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCanEdit } from "./WriteAccess";

type Fund = { id: string; name: string };

export default function FundQualification({ entityType, entityId, fund, options, readOnly = false }: {
  entityType: "deal" | "company";
  entityId: string;
  fund: Fund | null;
  options: Fund[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const canEdit = useCanEdit() && !readOnly;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  async function setFund(next: Fund | null) {
    const label = entityType === "deal" ? "Dossier" : "Société";
    if (!next && fund && !confirm(`Retirer de ${fund.name} ? ${entityType === "deal" ? "Le dossier retourne au pipeline non qualifié." : ""}`)) return;
    setBusy(true); setError(null);
    const supabase = createClient();
    const table = entityType === "deal" ? "deals" : "portfolio_companies";
    const { error: err } = await supabase.from(table).update({ fund_id: next?.id ?? null }).eq("id", entityId);
    if (err) { setBusy(false); setError(err.message); return; }
    await supabase.from("notes").insert({
      entity_type: entityType, entity_id: entityId, type: "Note",
      note_date: new Date().toISOString().slice(0, 10),
      summary: next
        ? `${label} qualifié${entityType === "company" ? "e" : ""} pour ${next.name}${fund ? ` (auparavant ${fund.name})` : ""}`
        : `${label} retiré${entityType === "company" ? "e" : ""} de ${fund?.name ?? "son fonds"}${entityType === "deal" ? " — retour au pipeline non qualifié" : ""}`,
    });
    setBusy(false); setChoosing(false);
    router.refresh();
  }

  const chip: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600 };
  const others = options.filter((o) => o.id !== fund?.id);

  return (
    <>
      {fund ? (
        <span style={{ ...chip, background: "#4A26171a", color: "#4A2617", border: "1px solid #4A261733" }} title="Suivi pour ce fonds">
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4A2617" }} />
          {fund.name}
          {canEdit && <button onClick={() => setFund(null)} disabled={busy} aria-label={`Retirer de ${fund.name}`} title={`Retirer de ${fund.name}`}
            style={{ marginLeft: 2, background: "none", border: "none", padding: 0, cursor: "pointer", color: "#4A2617", fontSize: 13, lineHeight: 1 }}>×</button>}
        </span>
      ) : (
        <span style={{ ...chip, background: "var(--surface-cream)", color: "var(--text-3)", border: "1px solid var(--border)" }} title="Aucun fonds : pipeline non qualifié">
          {entityType === "deal" ? "Pipeline non qualifié" : "Hors fonds"}
        </span>
      )}
      {canEdit && others.length > 0 && (
        choosing ? (
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            {others.map((o) => (
              <button key={o.id} disabled={busy} onClick={() => setFund(o)}
                style={{ ...chip, cursor: "pointer", fontFamily: "inherit", background: "var(--surface)", color: "#4A2617", border: "1px dashed #4A261766" }}>
                {o.name}
              </button>
            ))}
            <button onClick={() => setChoosing(false)} style={{ ...chip, cursor: "pointer", fontFamily: "inherit", background: "transparent", color: "var(--text-3)", border: "none" }}>Annuler</button>
          </span>
        ) : (
          <button onClick={() => (others.length === 1 ? setFund(others[0]) : setChoosing(true))} disabled={busy}
            style={{ ...chip, cursor: "pointer", fontFamily: "inherit", background: "transparent", color: "var(--camel)", border: "1px dashed var(--border-strong)" }}>
            {fund ? "Changer de fonds" : others.length === 1 ? `+ Qualifier pour ${others[0].name}` : "+ Qualifier pour un fonds"}
          </button>
        )
      )}
      {error && <span style={{ fontSize: 11.5, color: "var(--red-fg, #A6412E)" }}>{error}</span>}
    </>
  );
}
