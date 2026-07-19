"use client";

// Onglet « Présentation » de la société — le pendant de la Présentation d'un dossier.
//
// Une société n'avait aucun écran disant QUI elle est. Le dossier, lui, a sa thèse. Cette
// asymétrie est comblée : identité (année, ville, stade), profil libre, rationnel
// d'investissement repris du dossier d'origine, et promoteur.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCanEdit } from "@/components/shared/WriteAccess";
import { Field, Input, Select } from "@/components/ui/form";
import { DEVELOPMENT_STAGES } from "@/lib/ui-constants";
import { useDebouncedSave } from "@/components/shared/useDebouncedSave";
import { useCallback } from "react";

type Presentation = {
  description: string | null;
  originThesis: string | null;
  promoter: string | null;
  foundedYear: number | null;
  city: string | null;
  developmentStage: string | null;
};

export default function CompanyPresentationTab({ companyId, presentation, originDealId, originDealName, onOpenOrigin }: {
  companyId: string;
  presentation: Presentation;
  originDealId: string | null;
  originDealName: string | null;
  onOpenOrigin?: () => void;
}) {
  const canEdit = useCanEdit();

  const [desc, setDesc] = useState(presentation.description ?? "");
  const [year, setYear] = useState(presentation.foundedYear != null ? String(presentation.foundedYear) : "");
  const [city, setCity] = useState(presentation.city ?? "");
  const [stage, setStage] = useState(presentation.developmentStage ?? "");

  const saveField = useCallback(async (patch: Record<string, string | number | null>) => {
    await createClient().from("portfolio_companies").update(patch).eq("id", companyId);
    // Pas de router.refresh() : il réinitialiserait les champs frères en cours de saisie.
  }, [companyId]);

  useDebouncedSave(year, presentation.foundedYear != null ? String(presentation.foundedYear) : "",
    (v) => saveField({ founded_year: v.trim() ? Number(v) : null }));
  useDebouncedSave(city, presentation.city ?? "",
    (v) => saveField({ city: v.trim() || null }));
  useDebouncedSave(desc, presentation.description ?? "",
    (v) => saveField({ description: v.trim() || null }));

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {presentation.promoter && (
        <div className="card" style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>Promoteur</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{presentation.promoter}</span>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>repris des contacts</span>
        </div>
      )}

      <div className="card" style={{ padding: "16px 18px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>Identité</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Field label="Année de création">
            <Input type="number" value={year} disabled={!canEdit} placeholder="Ex : 2019"
              onChange={(e) => setYear(e.target.value)} />
          </Field>
          <Field label="Ville">
            <Input value={city} disabled={!canEdit} placeholder="Ex : Cotonou"
              onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Stade de développement">
            <Select value={stage} disabled={!canEdit}
              onChange={(e) => { setStage(e.target.value); saveField({ development_stage: e.target.value || null }); }}>
              <option value="">—</option>
              {DEVELOPMENT_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
      </div>

      <div className="card" style={{ padding: "16px 18px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Profil de l&apos;entreprise</div>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={6} readOnly={!canEdit} disabled={!canEdit}
          placeholder="Activité, positionnement, marché, avantage concurrentiel…"
          style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 9, fontSize: 12.5, fontFamily: "inherit", outline: "none", background: "var(--surface)", color: "var(--ink)", resize: "vertical", lineHeight: 1.6 }} />
      </div>

      <div className="card" style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Rationnel de l&apos;investissement</div>
          {originDealId && onOpenOrigin && (
            <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11.5 }} onClick={onOpenOrigin}>Instruction d&apos;origine →</button>
          )}
        </div>
        {presentation.originThesis ? (
          <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{presentation.originThesis}</div>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--text-3)", fontStyle: "italic" }}>
            {originDealName
              ? `Aucune thèse n'avait été saisie sur le dossier ${originDealName}.`
              : "Cette société n'est pas issue d'un dossier du pipeline ; le rationnel se saisit dans le profil ci-dessus."}
          </div>
        )}
      </div>
    </div>
  );
}
