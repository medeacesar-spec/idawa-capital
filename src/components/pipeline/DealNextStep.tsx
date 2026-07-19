"use client";

// « Et ensuite ? » — la question qui revient à chaque comité.
//
// Elle n'a PAS son propre champ : une tâche du Suivi porte déjà un titre, un responsable,
// une échéance et un statut. Ajouter un champ « prochaine étape » créerait un second
// endroit où noter la même chose, et les deux finiraient par se contredire.
//
// Ce bloc ne stocke donc rien : il REMONTE la tâche ouverte dont l'échéance est la plus
// proche, pour qu'on la voie sans ouvrir l'onglet Suivi. Un dossier sans tâche ouverte est
// un dossier qui dort, et c'est précisément ce qu'il faut voir.
//
// Le POST-MORTEM, lui, est bien un champ propre : il n'existe qu'une fois le dossier
// écarté, ne se coche pas comme une tâche, et raconte ce qu'on a appris.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCanEdit } from "@/components/shared/WriteAccess";
import type { SuiviTask } from "@/lib/data/suivi";
import NextStepBanner from "@/components/shared/NextStepBanner";
import { useDebouncedSave } from "@/components/shared/useDebouncedSave";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDate(d: string | null) { if (!d) return null; const s = d.slice(0, 10); return `${parseInt(s.slice(8, 10), 10)} ${MONTHS[parseInt(s.slice(5, 7), 10) - 1] ?? ""} ${s.slice(0, 4)}`; }

export default function DealNextStep({ dealId, tasks, postMortem, postMortemAt, rejectionReason, rejected, onOpenSuivi }: {
  dealId: string;
  tasks: SuiviTask[];
  postMortem: string | null;
  postMortemAt: string | null;
  rejectionReason: string | null;
  rejected: boolean;
  onOpenSuivi: () => void;
}) {
  const canEdit = useCanEdit();
  const [pm, setPm] = useState(postMortem ?? "");
  const [pmAt, setPmAt] = useState(postMortemAt);

  // Sauvegarde différée fiable, sans router.refresh() qui réinitialiserait le champ.
  useDebouncedSave(pm, postMortem ?? "", async (v) => {
    const at = v.trim() ? new Date().toISOString() : null;
    await createClient().from("deals").update({ post_mortem: v.trim() || null, post_mortem_at: at }).eq("id", dealId);
    setPmAt(at);
  });

  return (
    <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
      <NextStepBanner tasks={tasks} kind="deal" onOpenSuivi={onOpenSuivi} />

      {rejected && (
        <div className="card" style={{ padding: "13px 16px", borderLeft: "3px solid var(--red-fg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>Post-mortem</span>
            {rejectionReason && <span className="badge badge-red">Écarté · {rejectionReason}</span>}
            {pmAt && <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: "auto" }}>Rédigé le {frDate(pmAt)}</span>}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-2)", marginBottom: 8 }}>
            Pourquoi ce dossier n&apos;a pas abouti : ce qui a manqué, ce qu&apos;on ferait autrement, ce qui pourrait le rouvrir.
          </div>
          <textarea value={pm} onChange={(e) => setPm(e.target.value)} rows={4} readOnly={!canEdit} disabled={!canEdit}
            placeholder="Ex : valorisation trop élevée au regard des comparables, dirigeant peu ouvert à la gouvernance. À revoir si une levée intermédiaire abaisse le prix."
            style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", outline: "none", background: "var(--surface)", color: "var(--ink)", resize: "vertical", lineHeight: 1.5 }} />
        </div>
      )}
    </div>
  );
}
