"use client";

// Présentation du dossier — alignée sur celle de la société : Promoteur, Identité
// (année, ville, stade), Profil de l'entreprise, et Rationnel (la thèse d'investissement).
// Les mêmes blocs des deux côtés, pour qu'un dossier converti ne perde pas sa fiche.

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCanEdit } from "@/components/shared/WriteAccess";
import { useDebouncedSave } from "@/components/shared/useDebouncedSave";
import { Field, Input, Select } from "@/components/ui/form";
import { DEVELOPMENT_STAGES } from "@/lib/ui-constants";
import PromoterCard, { type PromoterData } from "@/components/shared/PromoterCard";

export type DealPresentation = {
  description: string | null;
  thesis: string | null;
  foundedYear: number | null;
  city: string | null;
  developmentStage: string | null;
  promoter: PromoterData;
};

export default function DealPresentationTab({ dealId, presentation }: { dealId: string; presentation: DealPresentation }) {
  const canEdit = useCanEdit();

  const [desc, setDesc] = useState(presentation.description ?? "");
  const [year, setYear] = useState(presentation.foundedYear != null ? String(presentation.foundedYear) : "");
  const [city, setCity] = useState(presentation.city ?? "");
  const [stage, setStage] = useState(presentation.developmentStage ?? "");

  const saveField = useCallback(async (patch: Record<string, string | number | null>) => {
    await createClient().from("deals").update(patch).eq("id", dealId);
  }, [dealId]);

  useDebouncedSave(year, presentation.foundedYear != null ? String(presentation.foundedYear) : "",
    (v) => saveField({ founded_year: v.trim() ? Number(v) : null }));
  useDebouncedSave(city, presentation.city ?? "", (v) => saveField({ city: v.trim() || null }));
  useDebouncedSave(desc, presentation.description ?? "", (v) => saveField({ description: v.trim() || null }));

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <PromoterCard table="deals" entityId={dealId} promoter={presentation.promoter} />

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
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Rationnel de l&apos;investissement</div>
        {presentation.thesis ? (
          <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{presentation.thesis}</div>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--text-3)", fontStyle: "italic" }}>
            Non renseigné. La thèse d&apos;investissement se saisit via « Modifier » (en-tête du dossier).
          </div>
        )}
      </div>
    </div>
  );
}
