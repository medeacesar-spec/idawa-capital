"use client";

import { useState } from "react";
import Link from "next/link";
import type { TodoData } from "@/lib/data/todo";

const KIND_COLOR: Record<string, string> = { ESG: "#7C7A3A", Action: "#8A5A18", "Due diligence": "#9A3B26", "Création de valeur": "#185FA5", "Comité": "#2F6140" };

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const frDay = (d: string) => `${parseInt(d.slice(8, 10), 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""}`;

/** Échéance située dans le temps : ni « en retard » ni « à venir » n'appellent la même réaction. */
function dueStatus(due: string): { text: string; overdue: boolean; soon: boolean } {
  const days = Math.round((Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(due)) / 86_400_000);
  if (days > 0) {
    const late = days === 1 ? "1 jour de retard" : days < 31 ? `${days} jours de retard` : `${Math.round(days / 30)} mois de retard`;
    return { text: `${frDay(due)} · ${late}`, overdue: true, soon: false };
  }
  if (days === 0) return { text: `${frDay(due)} · aujourd'hui`, overdue: false, soon: true };
  const ahead = -days;
  const dans = ahead === 1 ? "demain" : ahead < 31 ? `dans ${ahead} jours` : `dans ${Math.round(ahead / 30)} mois`;
  return { text: `${frDay(due)} · ${dans}`, overdue: false, soon: ahead <= 3 };
}

export default function TodoBanner({ data, currentUserId, canSeeAll, canValidateComites = false }: { data: TodoData; currentUserId: string; canSeeAll: boolean; canValidateComites?: boolean }) {
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [showLater, setShowLater] = useState(false);
  const effScope = canSeeAll ? scope : "mine";
  const items = effScope === "all"
    ? data.items
    : data.items.filter((it) => it.assigneeId === currentUserId || (it.validation && canValidateComites));

  const Toggle = canSeeAll ? (
    <div style={{ marginLeft: "auto", display: "flex", gap: 2, background: "var(--surface-2)", borderRadius: 8, padding: 2 }}>
      {([["mine", "Mes actions"], ["all", "Tout le fonds"]] as const).map(([k, label]) => (
        <button key={k} onClick={() => setScope(k)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none", background: scope === k ? "var(--surface)" : "transparent", color: scope === k ? "var(--espresso)" : "var(--text-3)", boxShadow: scope === k ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>{label}</button>
      ))}
    </div>
  ) : null;

  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: "13px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--green-bg)", color: "var(--green-fg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </span>
        <span style={{ fontSize: 13, color: "var(--text-2)" }}>{effScope === "mine" ? "Aucune action à prendre qui vous est assignée." : "Aucune action à prendre. Tout est à jour."}</span>
        {Toggle}
      </div>
    );
  }

  // Deux groupes : ce qui appelle une action MAINTENANT (en retard ou échéance < 1 semaine)
  // est montré d'emblée ; ce qui vient plus tard est replié derrière un bouton « + ».
  const weekAhead = new Date(); weekAhead.setDate(weekAhead.getDate() + 7);
  const threshold = weekAhead.toISOString().slice(0, 10);
  const isUrgent = (it: TodoData["items"][number]) => !it.dueDate || it.dueDate < threshold;
  const urgent = items.filter(isUrgent);
  const later = items.filter((it) => !isUrgent(it));

  const Row = (it: TodoData["items"][number], i: number) => {
    const st = it.dueDate ? dueStatus(it.dueDate) : null;
    const color = !st ? "var(--text-3)" : st.overdue ? "var(--red-fg)" : st.soon ? "var(--amber-fg)" : "var(--text-3)";
    return (
      <Link key={i} href={it.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderRadius: 8, textDecoration: "none" }} className="deal-row-click">
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: it.severity === "high" ? "var(--red-fg)" : "var(--amber-fg)", flexShrink: 0 }} />
        <span className="badge" style={{ background: `${KIND_COLOR[it.kind] ?? "#6B5744"}1a`, color: KIND_COLOR[it.kind] ?? "#6B5744", flexShrink: 0 }}>{it.kind}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
        <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{it.sub}</span>
        <span className="tnum" style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", color }}>{st ? st.text : "sans échéance"}</span>
      </Link>
    );
  };

  return (
    <div className="card" style={{ padding: "16px 20px", marginBottom: 16, borderLeft: "4px solid var(--camel)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--camel)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>À faire</span>
        <span className="badge" style={{ background: "var(--rework-bg)", color: "var(--rework)" }}>{urgent.length}</span>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>en retard ou sous 7 jours</span>
        {Toggle}
      </div>
      {urgent.length > 0 ? (
        <div style={{ display: "grid", gap: 2, maxHeight: 260, overflowY: "auto" }}>
          {urgent.map(Row)}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--text-2)", padding: "4px 2px 8px" }}>Rien d'urgent cette semaine.</div>
      )}
      {later.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setShowLater((s) => !s)} style={{ background: "none", border: "none", padding: "4px 2px", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "var(--camel)" }}>
            {showLater ? "− Masquer" : `+ ${later.length} action${later.length > 1 ? "s" : ""} plus tard`}
          </button>
          {showLater && <div style={{ display: "grid", gap: 2, maxHeight: 220, overflowY: "auto", marginTop: 4 }}>{later.map(Row)}</div>}
        </div>
      )}
      {effScope === "mine" && <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 8 }}>Vos actions urgentes (en retard ou sous 7 jours). Le reste est sous « + … plus tard ».{canSeeAll ? " « Tout le fonds » pour la vue direction." : ""}</div>}
    </div>
  );
}
