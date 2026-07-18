"use client";

import { useRouter } from "next/navigation";
import type { PerfOverview } from "@/lib/data/perfOverview";
import { fmtM } from "@/lib/format";

/** Flèche de comparaison : ▲ meilleur · ▼ moins bon · ▬ stable (écart < 2 %). */
function Delta({ value, ref: reference }: { value: number | null; ref: number | null }) {
  if (value == null || reference == null || reference === 0) return <span style={{ color: "var(--text-3)" }}>—</span>;
  const d = (value - reference) / Math.abs(reference);
  const flat = Math.abs(d) < 0.02;
  const up = d > 0;
  const color = flat ? "var(--amber-fg)" : up ? "var(--green-fg)" : "var(--red-fg)";
  return (
    <span title={`${d >= 0 ? "+" : ""}${(d * 100).toFixed(1)} %`} style={{ color, fontWeight: 700, fontSize: 12 }}>
      {flat ? "▬" : up ? "▲" : "▼"}
    </span>
  );
}

const pctOf = (a: number | null, b: number | null) => (a == null || !b ? null : a / b);

export default function PerfOverviewTable({ data }: { data: PerfOverview }) {
  const router = useRouter();
  const { year, years, rows } = data;

  const th: React.CSSProperties = { padding: "7px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "8px", fontSize: 12.5, textAlign: "right", whiteSpace: "nowrap", color: "var(--ink)" };
  const grp: React.CSSProperties = { ...th, textAlign: "center", color: "var(--camel)", fontSize: 11.5, borderLeft: "1px solid var(--sep)" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          Performance des participations <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— réalisé {year}, comparé à {year - 1} et au budget</span>
        </div>
        {years.length > 1 && (
          <select defaultValue={year} onChange={(e) => router.push(`/performance?annee=${e.target.value}`)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--ink)", fontSize: 12, fontFamily: "inherit" }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ padding: "24px", textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>
          Aucune donnée pour {year}. Saisissez les états financiers ou la grille Budget & BP d'une société.
        </div>
      ) : (
        <div className="card" style={{ padding: "4px 14px", overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left" }}></th>
                <th colSpan={3} style={grp}>Chiffre d&apos;affaires {year}</th>
                <th colSpan={3} style={grp}>EBE {year}</th>
                <th colSpan={3} style={grp}>Taux d&apos;EBE {year}</th>
              </tr>
              <tr>
                <th style={{ ...th, textAlign: "left" }}>Société</th>
                {[0, 1, 2].map((i) => (
                  <>
                    <th key={`a${i}`} style={{ ...th, borderLeft: "1px solid var(--sep)" }}>{i === 2 ? "%" : "M FCFA"}</th>
                    <th key={`b${i}`} style={th}>vs {year - 1}</th>
                    <th key={`c${i}`} style={th}>vs budget</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const tx = pctOf(r.ebe, r.ca), txPrev = pctOf(r.ebePrev, r.caPrev), txBud = pctOf(r.ebeBudget, r.caBudget);
                return (
                  <tr key={r.companyId} style={{ borderTop: "1px solid var(--sep)", cursor: "pointer" }}
                    onClick={() => router.push(`/portefeuille/${r.companyId}`)}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{r.company}</td>

                    <td style={{ ...td, borderLeft: "1px solid var(--sep)" }} className="serif tnum">{r.ca != null ? fmtM(r.ca) : "—"}</td>
                    <td style={td}><Delta value={r.ca} ref={r.caPrev} /></td>
                    <td style={td}><Delta value={r.ca} ref={r.caBudget} /></td>

                    <td style={{ ...td, borderLeft: "1px solid var(--sep)" }} className="serif tnum">{r.ebe != null ? fmtM(r.ebe) : "—"}</td>
                    <td style={td}><Delta value={r.ebe} ref={r.ebePrev} /></td>
                    <td style={td}><Delta value={r.ebe} ref={r.ebeBudget} /></td>

                    <td style={{ ...td, borderLeft: "1px solid var(--sep)" }} className="tnum">{tx != null ? `${(tx * 100).toFixed(0)} %` : "—"}</td>
                    <td style={td}><Delta value={tx} ref={txPrev} /></td>
                    <td style={td}><Delta value={tx} ref={txBud} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 8 }}>
        ▲ en progression · ▼ en retrait · ▬ stable (écart inférieur à 2 %). Survolez une flèche pour voir l&apos;écart exact. Le réalisé vient des états financiers OHADA, ou de la grille Budget & BP si les états ne sont pas saisis.
      </div>
    </div>
  );
}
