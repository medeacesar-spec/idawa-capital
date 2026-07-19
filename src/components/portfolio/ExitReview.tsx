"use client";

// Bilan de sortie — pendant du post-mortem d'un dossier écarté, sur une participation
// sortie ou radiée. Ne s'affiche qu'une fois la participation terminée : ce qu'on retient
// de l'opération, ce qui a marché, ce qui manquerait à refaire.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCanEdit } from "@/components/shared/WriteAccess";
import { useDebouncedSave } from "@/components/shared/useDebouncedSave";

export default function ExitReview({ companyId, value }: { companyId: string; value: string | null }) {
  const canEdit = useCanEdit();
  const [text, setText] = useState(value ?? "");

  useDebouncedSave(text, value ?? "", async (v) => {
    await createClient().from("portfolio_companies").update({ exit_review: v.trim() || null }).eq("id", companyId);
  });

  return (
    <div className="card" style={{ padding: "13px 16px", marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Bilan de sortie</div>
      <div style={{ fontSize: 11.5, color: "var(--text-2)", marginBottom: 8 }}>
        Ce qu&apos;on retient de cette participation terminée : le résultat obtenu, ce qui a créé la valeur, ce qu&apos;on ferait autrement.
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} readOnly={!canEdit} disabled={!canEdit}
        placeholder="Ex : sortie à 2,1x après 5 ans. La montée en gouvernance a été décisive ; la diversification produit trop tardive a pesé sur le multiple."
        style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", outline: "none", background: "var(--surface)", color: "var(--ink)", resize: "vertical", lineHeight: 1.5 }} />
    </div>
  );
}
