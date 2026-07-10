"use client";

import type { PerformanceData } from "@/lib/data/performance";
import { fmtM, fmtMult } from "@/lib/format";

function pct(f: number | null) { return f == null ? "—" : `${(f * 100).toFixed(1)} %`; }
function multColor(m: number | null) { return m == null ? "var(--text-3)" : m >= 1 ? "var(--green-fg)" : "var(--red-fg)"; }

function Tile({ k, v, sub, color }: { k: string; v: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{k}</div>
      <div className="serif tnum" style={{ fontSize: 23, fontWeight: 600, color: color ?? "var(--ink)", lineHeight: 1, marginTop: 7 }}>{v}</div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "right", padding: "9px 12px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-3)", fontWeight: 700, whiteSpace: "nowrap", borderBottom: "1px solid var(--border)" };
const td: React.CSSProperties = { textAlign: "right", padding: "9px 12px", fontSize: 12.5, color: "var(--ink)", whiteSpace: "nowrap", borderTop: "1px solid var(--sep)" };

export default function PerformanceClient({ data }: { data: PerformanceData }) {
  function exportPdf() { window.print(); }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>
          {data.flowBased ? "TRI calculé sur les flux datés (appels, distributions, valorisation)." : "TRI estimé à partir de la date et du montant d'entrée, faute de flux détaillés saisis."}
        </div>
        <button className="btn btn-ghost no-print" onClick={exportPdf}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>
          Exporter en PDF
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Tile k="Multiple (TVPI)" v={fmtMult(data.tvpi)} sub="(distribué + valeur) / appelé" color={multColor(data.tvpi)} />
        <Tile k="TRI (net des flux)" v={pct(data.irr)} sub="Rendement annualisé" color={data.irr != null && data.irr >= 0 ? "var(--green-fg)" : "var(--red-fg)"} />
        <Tile k="DPI (distribué)" v={fmtMult(data.dpi)} sub="Distribué / appelé" />
        <Tile k="RVPI (résiduel)" v={fmtMult(data.rvpi)} sub="Valeur résiduelle / appelé" />
        <Tile k="Capital appelé" v={fmtM(data.paidIn)} sub="Investi à ce jour" />
        <Tile k="Distribué" v={fmtM(data.distributed)} sub="Sorties / dividendes" />
        <Tile k="Valeur (NAV)" v={fmtM(data.nav)} sub="Valorisation actuelle" color="var(--green-fg)" />
        <Tile k="Plus-value" v={fmtM(data.distributed + data.nav - data.paidIn)} sub="Gain total" color={data.distributed + data.nav - data.paidIn >= 0 ? "var(--green-fg)" : "var(--red-fg)"} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: "0 0 8px" }}>Par participation</div>
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ ...th, textAlign: "left" }}>Société</th><th style={th}>Millésime</th><th style={th}>Appelé</th><th style={th}>Distribué</th><th style={th}>Valeur</th><th style={th}>TVPI</th><th style={th}>DPI</th><th style={th}>TRI</th>
            </tr></thead>
            <tbody>
              {data.companies.map((c) => (
                <tr key={c.name}>
                  <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{c.name}</td>
                  <td style={{ ...td, color: "var(--text-3)" }}>{c.vintage ?? "—"}</td>
                  <td style={td}>{fmtM(c.paidIn)}</td>
                  <td style={td}>{c.distributed > 0 ? fmtM(c.distributed) : "—"}</td>
                  <td style={td}>{fmtM(c.value)}</td>
                  <td style={{ ...td, fontWeight: 600, color: multColor(c.tvpi) }}>{fmtMult(c.tvpi)}</td>
                  <td style={{ ...td, color: "var(--text-2)" }}>{c.dpi != null && c.dpi > 0 ? fmtMult(c.dpi) : "—"}</td>
                  <td style={{ ...td, fontWeight: 600, color: c.irr != null && c.irr >= 0 ? "var(--green-fg)" : "var(--red-fg)" }}>{pct(c.irr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: "0 0 8px" }}>Par millésime <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(vintage)</span></div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ ...th, textAlign: "left" }}>Année</th><th style={th}>Lignes</th><th style={th}>Appelé</th><th style={th}>Distribué</th><th style={th}>Valeur</th><th style={th}>TVPI</th><th style={th}>TRI</th>
            </tr></thead>
            <tbody>
              {data.vintages.length === 0 ? (
                <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: "var(--text-3)" }}>Aucune date d'entrée renseignée.</td></tr>
              ) : data.vintages.map((v) => (
                <tr key={v.year}>
                  <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{v.year}</td>
                  <td style={{ ...td, color: "var(--text-3)" }}>{v.count}</td>
                  <td style={td}>{fmtM(v.paidIn)}</td>
                  <td style={td}>{v.distributed > 0 ? fmtM(v.distributed) : "—"}</td>
                  <td style={td}>{fmtM(v.value)}</td>
                  <td style={{ ...td, fontWeight: 600, color: multColor(v.tvpi) }}>{fmtMult(v.tvpi)}</td>
                  <td style={{ ...td, fontWeight: 600, color: v.irr != null && v.irr >= 0 ? "var(--green-fg)" : "var(--red-fg)" }}>{pct(v.irr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
