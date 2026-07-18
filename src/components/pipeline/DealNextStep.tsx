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

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const frDay = (d: string) => `${d.slice(8, 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`;

const DONE = ["Fait", "Terminé", "Terminée", "Annulé", "Annulée"];

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

  const today = new Date().toISOString().slice(0, 10);
  const open = tasks
    .filter((t) => !DONE.includes(t.status ?? ""))
    // Sans échéance, une tâche passe après celles qui en ont une : elle n'engage à rien.
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const next = open[0] ?? null;
  const late = !!next?.dueDate && next.dueDate < today;

  async function savePostMortem() {
    if (pm === (postMortem ?? "")) return;
    await createClient().from("deals").update({ post_mortem: pm.trim() || null }).eq("id", dealId);
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
      <div className="card" style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>Prochaine étape</span>
        {next ? (
          <>
            <span style={{ fontSize: 12.5, color: "var(--ink)", flex: 1, minWidth: 180 }}>{next.title}</span>
            {next.assigneeLabel && <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>{next.assigneeLabel}</span>}
            {next.dueDate
              ? <span className={`badge ${late ? "badge-red" : "badge-neutral"}`}>{late ? "en retard · " : ""}{frDay(next.dueDate)}</span>
              : <span style={{ fontSize: 11, color: "var(--text-3)" }}>sans échéance</span>}
            {open.length > 1 && <span style={{ fontSize: 11, color: "var(--text-3)" }}>+{open.length - 1} autre{open.length > 2 ? "s" : ""}</span>}
          </>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-3)", flex: 1 }}>
            Aucune action ouverte — ce dossier n&apos;avance pas.
          </span>
        )}
        <button onClick={onOpenSuivi}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "var(--camel)", whiteSpace: "nowrap" }}>
          {next ? "Voir le suivi →" : "Ajouter une action →"}
        </button>
      </div>

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
