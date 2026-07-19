"use client";

// Bloc Promoteur — descriptif (nom, âge, sexe, diplôme, bio) + résumé de l'évaluation.
// Partagé par la Présentation du dossier et celle de la société ; il écrit dans la table
// de l'entité (deals ou portfolio_companies) passée en prop.

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCanEdit } from "@/components/shared/WriteAccess";
import { useDebouncedSave } from "@/components/shared/useDebouncedSave";
import { Field, Input, Select } from "@/components/ui/form";
import { PROMOTER_GENDERS } from "@/lib/ui-constants";
import PromoterEvalModal, { type PromoterEval, evalTotal, PROMOTER_TOTAL_MAX } from "./PromoterEvalModal";

export type PromoterData = {
  name: string | null;
  bio: string | null;
  diploma: string | null;
  age: number | null;
  gender: string | null;
  evaluation: PromoterEval | null;
};

export default function PromoterCard({ table, entityId, promoter, fallbackName }: {
  table: "deals" | "portfolio_companies";
  entityId: string;
  promoter: PromoterData;
  /** Nom déduit des contacts, proposé quand aucun nom n'a encore été saisi (sociétés). */
  fallbackName?: string | null;
}) {
  const canEdit = useCanEdit();
  const [evalOpen, setEvalOpen] = useState(false);

  const [name, setName] = useState(promoter.name ?? "");
  const [age, setAge] = useState(promoter.age != null ? String(promoter.age) : "");
  const [diploma, setDiploma] = useState(promoter.diploma ?? "");
  const [bio, setBio] = useState(promoter.bio ?? "");

  const saveField = useCallback(async (patch: Record<string, string | number | null>) => {
    await createClient().from(table).update(patch).eq("id", entityId);
  }, [table, entityId]);

  useDebouncedSave(name, promoter.name ?? "", (v) => saveField({ promoter_name: v.trim() || null }));
  useDebouncedSave(age, promoter.age != null ? String(promoter.age) : "", (v) => saveField({ promoter_age: v.trim() ? Number(v) : null }));
  useDebouncedSave(diploma, promoter.diploma ?? "", (v) => saveField({ promoter_diploma: v.trim() || null }));
  useDebouncedSave(bio, promoter.bio ?? "", (v) => saveField({ promoter_bio: v.trim() || null }));

  const { total, answered } = evalTotal(promoter.evaluation);
  const hasEval = answered > 0 || !!promoter.evaluation?.appreciation?.trim() || promoter.evaluation?.committeeNote != null;

  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Promoteur</div>
        {canEdit && (
          <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11.5 }} onClick={() => setEvalOpen(true)}>
            {hasEval ? "Modifier l'évaluation" : "Évaluer le promoteur"}
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
        <Field label="Nom">
          <Input value={name} disabled={!canEdit} placeholder={fallbackName || "Nom du promoteur"}
            onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Âge">
          <Input type="number" value={age} disabled={!canEdit} placeholder="Ex : 42"
            onChange={(e) => setAge(e.target.value)} />
        </Field>
        <Field label="Sexe">
          <Select value={promoter.gender ?? ""} disabled={!canEdit}
            onChange={(e) => saveField({ promoter_gender: e.target.value || null })}>
            <option value="">—</option>
            {PROMOTER_GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Plus haut diplôme">
        <Input value={diploma} disabled={!canEdit} placeholder="Ex : Master en gestion, Ingénieur agronome…"
          onChange={(e) => setDiploma(e.target.value)} />
      </Field>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11.5, color: "var(--text-2)", marginBottom: 5 }}>Biographie</div>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} readOnly={!canEdit} disabled={!canEdit}
          placeholder="Parcours, expériences marquantes, réalisations…"
          style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 9, fontSize: 12.5, fontFamily: "inherit", outline: "none", background: "var(--surface)", color: "var(--ink)", resize: "vertical", lineHeight: 1.6 }} />
      </div>

      {/* Résumé de l'évaluation, quand elle existe */}
      {hasEval && (
        <div style={{ marginTop: 14, padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface-cream)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-2)" }}>Note du promoteur</div>
              <div className="serif tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{total} <span style={{ fontSize: 12, color: "var(--text-3)" }}>/ {PROMOTER_TOTAL_MAX}</span></div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-2)" }}>Synthèse comité</div>
              <div className="serif tnum" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{promoter.evaluation?.committeeNote != null ? `${promoter.evaluation.committeeNote} / 3` : "—"}</div>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", marginLeft: "auto" }}>{answered} / 5 critères</div>
          </div>
          {promoter.evaluation?.appreciation?.trim() && (
            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginTop: 8, whiteSpace: "pre-wrap" }}>{promoter.evaluation.appreciation}</div>
          )}
        </div>
      )}

      {evalOpen && <PromoterEvalModal table={table} entityId={entityId} initial={promoter.evaluation} onClose={() => setEvalOpen(false)} />}
    </div>
  );
}
