"use client";

// Le journal répond à trois questions distinctes, qui n'ont pas à se lire à la suite :
// qui travaille (activité), ce qui a changé (modifications), qui accède (sécurité).
// Empilées, elles obligeaient à dérouler ; séparées, chacune s'ouvre directement.

import { useState } from "react";

export default function JournalTabs({ activity, changes, access, failures }: {
  activity: React.ReactNode;
  changes: React.ReactNode;
  access: React.ReactNode;
  /** Un échec d'accès mérite d'être visible depuis l'onglet fermé. */
  failures: number;
}) {
  const [tab, setTab] = useState<"activity" | "changes" | "access">("activity");

  const tabs: { key: typeof tab; label: string; hint: string; alert?: number }[] = [
    { key: "activity", label: "Activité de l'équipe", hint: "qui vient, qui agit, qui est connecté" },
    { key: "changes", label: "Modifications", hint: "ce qui a été créé, modifié ou supprimé, champ par champ" },
    { key: "access", label: "Accès & sécurité", hint: "connexions, déconnexions et tentatives échouées", alert: failures },
  ];
  const current = tabs.find((t) => t.key === tab)!;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {tabs.map((t) => {
          const on = t.key === tab;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} title={t.hint}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)",
                border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}` }}>
              {t.label}
              {!!t.alert && t.alert > 0 && (
                <span className="badge badge-red" style={{ fontSize: 10 }}>{t.alert}</span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>{current.hint}</div>

      <div style={{ display: tab === "activity" ? "block" : "none" }}>{activity}</div>
      <div style={{ display: tab === "changes" ? "block" : "none" }}>{changes}</div>
      <div style={{ display: tab === "access" ? "block" : "none" }}>{access}</div>
    </div>
  );
}
