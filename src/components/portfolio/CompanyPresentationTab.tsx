"use client";

// Onglet « Présentation » de la société — le pendant de la Présentation d'un dossier.
//
// Une société n'avait aucun écran disant QUI elle est. Le dossier, lui, a sa thèse. Cette
// asymétrie est comblée : profil de l'entreprise (description libre, éditable), rationnel
// d'investissement repris du dossier d'origine, et promoteur.
//
// Année de création, ville et stade de développement — que la fiche I&P attend aussi —
// n'ont pas encore de champ propre en base (gel de la période de tests). En attendant, ils
// se notent dans le profil ; l'invite du champ le rappelle.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCanEdit } from "@/components/shared/WriteAccess";

export default function CompanyPresentationTab({ companyId, presentation, originDealId, originDealName, onOpenOrigin }: {
  companyId: string;
  presentation: { description: string | null; originThesis: string | null; promoter: string | null };
  originDealId: string | null;
  originDealName: string | null;
  onOpenOrigin?: () => void;
}) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [desc, setDesc] = useState(presentation.description ?? "");

  async function save() {
    if (desc === (presentation.description ?? "")) return;
    await createClient().from("portfolio_companies").update({ description: desc.trim() || null }).eq("id", companyId);
    router.refresh();
  }

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
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Profil de l&apos;entreprise</div>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={6} readOnly={!canEdit} disabled={!canEdit} onBlur={save}
          placeholder="Activité, année de création, ville, stade de développement, positionnement…"
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
