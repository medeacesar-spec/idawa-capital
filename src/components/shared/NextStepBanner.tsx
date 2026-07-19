"use client";

// « Et ensuite ? » — la prochaine action, déduite des tâches ouvertes.
//
// Vaut pour un DOSSIER comme pour une SOCIÉTÉ : les deux portent un onglet Suivi avec des
// tâches. Un dossier sans action ouverte est un dossier qui dort ; une participation sans
// action ouverte est une participation qu'on ne suit plus. La même question, la même
// réponse — d'où un composant unique plutôt qu'un copié-collé qui divergerait.
//
// Ne stocke rien : ajouter un champ « prochaine étape » créerait un second endroit où
// noter ce qu'une tâche dit déjà, et les deux finiraient par se contredire.

import type { SuiviTask } from "@/lib/data/suivi";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const frDay = (d: string) => `${d.slice(8, 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`;
const DONE = ["Fait", "Terminé", "Terminée", "Annulé", "Annulée"];

export default function NextStepBanner({ tasks, kind, onOpenSuivi }: {
  tasks: SuiviTask[];
  /** Nuance le message quand rien n'est ouvert : un dossier « n'avance pas », une société « n'est plus suivie ». */
  kind: "deal" | "company";
  onOpenSuivi: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const open = tasks
    .filter((t) => !DONE.includes(t.status ?? ""))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const next = open[0] ?? null;
  const late = !!next?.dueDate && next.dueDate < today;

  const emptyMessage = kind === "deal"
    ? "Aucune action ouverte — ce dossier n'avance pas."
    : "Aucune action ouverte — cette participation n'est plus suivie.";

  return (
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
        <span style={{ fontSize: 12, color: "var(--text-3)", flex: 1 }}>{emptyMessage}</span>
      )}
      <button onClick={onOpenSuivi}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "var(--camel)", whiteSpace: "nowrap" }}>
        {next ? "Voir le suivi →" : "Ajouter une action →"}
      </button>
    </div>
  );
}
