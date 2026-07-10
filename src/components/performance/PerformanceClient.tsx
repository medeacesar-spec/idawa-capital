"use client";

import type { PerformanceData } from "@/lib/data/performance";
import { fmtM, fmtMult, fmtPct } from "@/lib/format";

function Tile({ k, v, sub, color }: { k: string; v: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "15px 16px" }}>
      <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{k}</div>
      <div className="serif tnum" style={{ fontSize: 25, fontWeight: 600, color: color ?? "var(--ink)", lineHeight: 1, marginTop: 7 }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

const panel: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" };

export default function PerformanceClient({ data }: { data: PerformanceData }) {
  const maxMult = Math.max(1.2, ...data.companies.map((c) => c.tvpi ?? 0));

  // Pont de création de valeur : coût investi -> plus-value -> valeur actuelle
  const H = 170;
  const base = 30;
  const maxVal = Math.max(data.valuation, data.invested) || 1;
  const scale = (H - base) / maxVal;
  const investedH = data.invested * scale;
  const gainH = Math.abs(data.gain) * scale;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 13, marginBottom: 16 }}>
        <Tile k="Multiple (TVPI)" v={fmtMult(data.tvpi)} sub="Valeur / capital investi" color="var(--green-fg)" />
        <Tile k="DPI (distribué)" v={fmtMult(data.dpi)} sub="Aucune sortie à ce jour" />
        <Tile k="TRI moyen" v={fmtPct(data.tri)} sub="Rendement annualisé" color={(data.tri ?? 0) >= 0 ? "var(--green-fg)" : "var(--red-fg)"} />
        <Tile k="Création de valeur" v={fmtM(data.gain)} sub={`${fmtM(data.invested)} investis`} color={data.gain >= 0 ? "var(--green-fg)" : "var(--red-fg)"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 13 }}>
        {/* Multiple par participation */}
        <div style={panel}>
          <h3 style={{ fontSize: 13.5, fontWeight: 600, margin: "0 0 14px", color: "var(--ink)" }}>Multiple par participation</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {data.companies.map((c) => {
              const good = (c.tvpi ?? 0) >= 1;
              return (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 90, fontSize: 12, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ flex: 1, background: "var(--sep)", borderRadius: 6, height: 20, position: "relative" }}>
                    <div style={{ width: `${((c.tvpi ?? 0) / maxMult) * 100}%`, height: "100%", background: good ? "var(--camel)" : "var(--red-fg)", borderRadius: 6 }} />
                  </div>
                  <div className="serif tnum" style={{ width: 44, textAlign: "right", fontSize: 12.5, fontWeight: 600, color: good ? "var(--green-fg)" : "var(--red-fg)" }}>{fmtMult(c.tvpi)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pont de création de valeur */}
        <div style={panel}>
          <h3 style={{ fontSize: 13.5, fontWeight: 600, margin: "0 0 6px", color: "var(--ink)" }}>Pont de création de valeur</h3>
          <svg viewBox="0 0 300 200" width="100%" height="190" preserveAspectRatio="xMidYMid meet">
            {/* Capital investi */}
            <rect x="30" y={H - investedH} width="60" height={investedH} rx="4" fill="#8A7256" />
            <text x="60" y={H - investedH - 8} textAnchor="middle" className="serif" style={{ fontSize: 13, fontWeight: 600, fill: "var(--ink)" }}>{fmtM(data.invested)}</text>
            <text x="60" y="192" textAnchor="middle" style={{ fontSize: 10.5, fill: "var(--text-2)" }}>Investi</text>
            {/* Plus-value */}
            <rect x="120" y={H - investedH - gainH} width="60" height={gainH} rx="4" fill={data.gain >= 0 ? "#3B6D11" : "#A6412E"} />
            <text x="150" y={H - investedH - gainH - 8} textAnchor="middle" className="serif" style={{ fontSize: 13, fontWeight: 600, fill: data.gain >= 0 ? "var(--green-fg)" : "var(--red-fg)" }}>{data.gain >= 0 ? "+" : ""}{fmtM(data.gain)}</text>
            <text x="150" y="192" textAnchor="middle" style={{ fontSize: 10.5, fill: "var(--text-2)" }}>Plus-value</text>
            {/* Valeur actuelle */}
            <rect x="210" y={H - data.valuation * scale} width="60" height={data.valuation * scale} rx="4" fill="var(--espresso)" />
            <text x="240" y={H - data.valuation * scale - 8} textAnchor="middle" className="serif" style={{ fontSize: 13, fontWeight: 600, fill: "var(--ink)" }}>{fmtM(data.valuation)}</text>
            <text x="240" y="192" textAnchor="middle" style={{ fontSize: 10.5, fill: "var(--text-2)" }}>Valeur</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
