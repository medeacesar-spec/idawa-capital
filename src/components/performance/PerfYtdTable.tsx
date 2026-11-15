"use client";

// Performance en cours d'année, à partir des dépôts mensuels des entreprises (mêmes calculs que le
// RECAP du classeur Idawa) : CA cumulé à date face au budget des mêmes mois et à la même période N-1.

import type { PerfYtd } from "@/lib/data/perfOverview";
import { fmtM as fmtMRaw } from "@/lib/format";
const fmtM = (n: number | null) => (n == null ? "—" : fmtMRaw(n));

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const pct = (a: number | null, b: number | null) => (a == null || !b ? null : a / b);
const fmtPct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)} %`);
function tone(x: number | null) {
  if (x == null) return "var(--text-3)";
  return x >= 0.8 ? "var(--green-fg)" : x >= 0.3 ? "var(--amber-fg)" : "var(--red-fg)";
}

export default function PerfYtdTable({ data }: { data: PerfYtd }) {
  const { year, rows } = data;
  const th: React.CSSProperties = { padding: "7px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "8px", fontSize: 12.5, textAlign: "right", whiteSpace: "nowrap", color: "var(--ink)" };
  const tot = rows.reduce((a, r) => ({ ca: a.ca + (r.ca ?? 0), bud: a.bud + (r.caBudget ?? 0), prev: a.prev + (r.caPrev ?? 0) }), { ca: 0, bud: 0, prev: 0 });
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>
        En cours d&apos;année {year} <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— à partir des tableaux de bord mensuels déposés par les entreprises</span>
      </div>
      {rows.length === 0 ? (
        <div className="card" style={{ padding: 20, fontSize: 12.5, color: "var(--text-3)", textAlign: "center" }}>
          Aucun tableau de bord mensuel déposé pour {year}.
        </div>
      ) : (
        <div className="card" style={{ padding: "4px 12px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--sep)" }}>
                <th style={{ ...th, textAlign: "left" }}>Société</th>
                <th style={th}>Jusqu&apos;à</th>
                <th style={th}>CA cumulé (M FCFA)</th>
                <th style={th}>Budget à date</th>
                <th style={th}>Taux à date</th>
                <th style={th}>Même période {year - 1}</th>
                <th style={th}>Évolution</th>
                <th style={th}>Avancement du budget annuel</th>
                <th style={th}>Trésorerie fin de mois</th>
                <th style={th}>Prévu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const t = pct(r.ca, r.caBudget), ev = r.caPrev ? (r.ca ?? 0) / r.caPrev - 1 : null;
                return (
                  <tr key={r.companyId} style={{ borderBottom: "1px solid var(--sep)" }}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 600 }}><a href={`/portefeuille/${r.companyId}`} style={{ color: "var(--ink)", textDecoration: "none" }}>{r.company}</a></td>
                    <td style={{ ...td, color: "var(--text-2)" }}>{MONTHS[r.lastMonth - 1]}</td>
                    <td style={td}>{fmtM(r.ca)}</td>
                    <td style={td}>{fmtM(r.caBudget)}</td>
                    <td style={{ ...td, color: tone(t), fontWeight: 700 }}>{fmtPct(t)}</td>
                    <td style={td}>{fmtM(r.caPrev)}</td>
                    <td style={{ ...td, color: ev == null ? "var(--text-3)" : ev >= 0 ? "var(--green-fg)" : "var(--red-fg)" }}>{ev == null ? "—" : `${ev >= 0 ? "+" : ""}${Math.round(ev * 100)} %`}</td>
                    <td style={td}>{fmtPct(pct(r.ca, r.caBudgetYear))}</td>
                    <td style={td}>{fmtM(r.treso)}</td>
                    <td style={td}>{fmtM(r.tresoBudget)}</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>Portefeuille</td>
                <td style={td} />
                <td style={{ ...td, fontWeight: 700 }}>{fmtM(tot.ca)}</td>
                <td style={{ ...td, fontWeight: 700 }}>{fmtM(tot.bud)}</td>
                <td style={{ ...td, fontWeight: 700, color: tone(pct(tot.ca, tot.bud)) }}>{fmtPct(pct(tot.ca, tot.bud))}</td>
                <td style={{ ...td, fontWeight: 700 }}>{fmtM(tot.prev || null)}</td>
                <td colSpan={4} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
