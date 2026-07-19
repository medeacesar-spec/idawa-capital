"use client";

// Deux métiers, deux onglets.
//
// La consolidation de l'accélération se trouvait tout en bas de la page, après les
// multiples, le tableau des participations et l'échéancier : il fallait dérouler pour
// l'atteindre, comme si elle était accessoire. Les deux moitiés du fonds se lisent
// séparément et méritent le même rang.

import { useState } from "react";

export default function PerformanceTabs({ equity, support, hasSupport }: {
  equity: React.ReactNode;
  support: React.ReactNode;
  /** Sans programme d'accompagnement, l'onglet n'aurait rien à montrer. */
  hasSupport: boolean;
}) {
  const [tab, setTab] = useState<"equity" | "support">("equity");
  if (!hasSupport) return <>{equity}</>;

  const tabs: { key: "equity" | "support"; label: string; hint: string }[] = [
    { key: "equity", label: "Participations", hint: "multiples, TRI, valorisations et échéances" },
    { key: "support", label: "Accélération", hint: "entreprises suivies, budgets et résultats des programmes" },
  ];
  const current = tabs.find((t) => t.key === tab)!;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {tabs.map((t) => {
          const on = t.key === tab;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} title={t.hint}
              style={{ padding: "8px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)",
                border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}` }}>
              {t.label}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>{current.hint}</div>

      {/* Les deux contenus sont rendus côté serveur ; on n'affiche que celui demandé. */}
      <div style={{ display: tab === "equity" ? "block" : "none" }}>{equity}</div>
      <div style={{ display: tab === "support" ? "block" : "none" }}>{support}</div>
    </div>
  );
}
