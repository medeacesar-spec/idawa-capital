"use client";

import { useState } from "react";
import type { KpiLibraryData } from "@/lib/data/kpiLibrary";
import { KPI_DIMENSIONS, KPI_DIM_COLOR, KPI_DIM_LABEL } from "@/lib/ui-constants";

const KPI_CATEGORIES = KPI_DIMENSIONS;
const CAT_COLOR = KPI_DIM_COLOR;
const CAT_LABEL = KPI_DIM_LABEL;

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", border: "1px solid var(--border-strong)", borderRadius: 10,
  background: "var(--surface)", color: "var(--ink)", fontSize: 13, fontFamily: "inherit", cursor: "pointer",
};

export default function KpiLibraryClient({ data }: { data: KpiLibraryData }) {
  const [indId, setIndId] = useState(data.industries[0]?.id ?? "");
  const industry = data.industries.find((i) => i.id === indId) ?? data.industries[0];
  const [subId, setSubId] = useState(industry?.subSectors[0]?.id ?? "");

  const currentInd = data.industries.find((i) => i.id === indId);
  const subs = currentInd?.subSectors ?? [];
  const effectiveSub = subs.find((s) => s.id === subId) ?? subs[0];
  const basket = effectiveSub ? data.baskets[effectiveSub.id] ?? {} : {};

  function onIndustry(id: string) {
    setIndId(id);
    const firstSub = data.industries.find((i) => i.id === id)?.subSectors[0];
    setSubId(firstSub?.id ?? "");
  }

  const count = KPI_CATEGORIES.reduce((a, c) => a + (basket[c]?.length ?? 0), 0);

  return (
    <div>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 14 }}>
        <b className="tnum" style={{ color: "var(--ink)" }}>{data.total}</b> indicateurs · {data.industries.length} industries · {data.industries.reduce((a, i) => a + i.subSectors.length, 0)} sous-secteurs
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 5 }}>Industrie</div>
          <select style={selectStyle} value={indId} onChange={(e) => onIndustry(e.target.value)}>
            {data.industries.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 5 }}>Sous-secteur</div>
          <select style={selectStyle} value={effectiveSub?.id ?? ""} onChange={(e) => setSubId(e.target.value)}>
            {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--ink)" }}>Panier de KPIs</h3>
          <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{count} indicateurs</span>
        </div>
        {KPI_CATEGORIES.map((cat) => {
          const items = basket[cat] ?? [];
          if (items.length === 0) return null;
          const color = CAT_COLOR[cat];
          return (
            <div key={cat} style={{ marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--sep)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{CAT_LABEL[cat]}</span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{items.length}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {items.map((name) => (
                  <span key={name} style={{ padding: "5px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: color, color: "#fff" }}>{name}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10 }}>
        L'édition du catalogue (ajouter / renommer / retirer des indicateurs) sera activée pour les administrateurs.
      </div>
    </div>
  );
}
