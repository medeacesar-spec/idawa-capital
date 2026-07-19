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
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCanEdit } from "@/components/shared/WriteAccess";
import type { SuiviTask } from "@/lib/data/suivi";
import NextStepBanner from "@/components/shared/NextStepBanner";

export default function DealNextStep({ dealId, tasks, postMortem, rejected, onOpenSuivi }: {
  dealId: string;
  tasks: SuiviTask[];
  postMortem: string | null;
  rejected: boolean;
  onOpenSuivi: () => void;
}) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [pm, setPm] = useState(postMortem ?? "");

  async function savePostMortem() {
    if (pm === (postMortem ?? "")) return;
    await createClient().from("deals").update({ post_mortem: pm.trim() || null }).eq("id", dealId);
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
      <NextStepBanner tasks={tasks} kind="deal" onOpenSuivi={onOpenSuivi} />

      {rejected && (
        <div className="card" style={{ padding: "13px 16px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Post-mortem</div>
          <div style={{ fontSize: 11.5, color: "var(--text-2)", marginBottom: 8 }}>
            Ce qu&apos;on retient de ce dossier écarté : ce qui a manqué, ce qu&apos;on ferait autrement, ce qui pourrait le rouvrir.
          </div>
          <textarea value={pm} onChange={(e) => setPm(e.target.value)} rows={4} readOnly={!canEdit} disabled={!canEdit}
            onBlur={savePostMortem}
            placeholder="Ex : valorisation trop élevée au regard des comparables, dirigeant peu ouvert à la gouvernance. À revoir si une levée intermédiaire abaisse le prix."
            style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", outline: "none", background: "var(--surface)", color: "var(--ink)", resize: "vertical", lineHeight: 1.5 }} />
        </div>
      )}
    </div>
  );
}
