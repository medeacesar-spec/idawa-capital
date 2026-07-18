"use client";

// D'où viennent les dossiers, et lesquels aboutissent.
//
// Nouss demandait de pouvoir analyser le deal flow par source d'entrée. Compter les
// dossiers ne suffit pas : une source qui en apporte beaucoup mais n'aboutit jamais coûte
// du temps, une source discrète qui convertit vaut qu'on l'entretienne. On rapproche donc
// le volume du taux d'aboutissement.

import { useState } from "react";
import { fmtM } from "@/lib/format";
import type { PipelineDeal } from "@/lib/data/pipeline";

const SANS_SOURCE = "Source non renseignée";

export default function SourceAnalysis({ deals }: { deals: PipelineDeal[] }) {
  const [open, setOpen] = useState(false);
  if (deals.length === 0) return null;

  const rows = Array.from(
    deals.reduce((acc, d) => {
      const key = d.source ?? SANS_SOURCE;
      const cur = acc.get(key) ?? { source: key, total: 0, amount: 0, converted: 0, rejected: 0 };
      cur.total += 1;
      cur.amount += d.amount ?? 0;
      if (d.convertedCompanyId) cur.converted += 1;
      if (d.dealState === "Écarté") cur.rejected += 1;
      acc.set(key, cur);
      return acc;
    }, new Map<string, { source: string; total: number; amount: number; converted: number; rejected: number }>()).values()
  ).sort((a, b) => b.total - a.total);

  const totalDeals = deals.length;
  const totalConverted = rows.reduce((a, r) => a + r.converted, 0);
  const peak = Math.max(...rows.map((r) => r.total));

  const th: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "7px 8px", fontSize: 12, color: "var(--ink)", textAlign: "right", whiteSpace: "nowrap" };

  return (
    <div style={{ marginTop: 18 }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--camel)" }}>
        {open ? "− Masquer" : "+ Analyser"} le deal flow par source
        <span style={{ fontWeight: 400, color: "var(--text-3)", marginLeft: 6 }}>
          {rows.length} source{rows.length > 1 ? "s" : ""} · {totalConverted} dossier{totalConverted > 1 ? "s" : ""} abouti{totalConverted > 1 ? "s" : ""}
        </span>
      </button>

      {open && (
        <div className="card" style={{ padding: "6px 14px", marginTop: 10, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left", width: "auto" }}>Source d&apos;entrée</th>
                <th style={th}>Dossiers</th>
                <th style={th}>Part</th>
                <th style={th}>Montant</th>
                <th style={th}>Aboutis</th>
                <th style={th}>Écartés</th>
                <th style={th}>Taux d&apos;aboutissement</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rate = r.total > 0 ? r.converted / r.total : 0;
                return (
                  <tr key={r.source} style={{ borderTop: "1px solid var(--sep)" }}>
                    <td style={{ ...td, textAlign: "left" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: r.source === SANS_SOURCE ? "var(--text-3)" : "var(--ink)", fontStyle: r.source === SANS_SOURCE ? "italic" : "normal" }}>{r.source}</span>
                        <span style={{ flex: 1, minWidth: 40, height: 5, borderRadius: 999, background: "var(--surface-cream)", overflow: "hidden", maxWidth: 90 }}>
                          <span style={{ display: "block", width: `${(r.total / peak) * 100}%`, height: "100%", background: "var(--camel)" }} />
                        </span>
                      </div>
                    </td>
                    <td className="tnum" style={{ ...td, fontWeight: 600 }}>{r.total}</td>
                    <td className="tnum" style={{ ...td, color: "var(--text-2)" }}>{Math.round((r.total / totalDeals) * 100)} %</td>
                    <td className="tnum serif" style={td}>{fmtM(r.amount)}</td>
                    <td className="tnum" style={{ ...td, color: r.converted > 0 ? "var(--green-fg)" : "var(--text-3)" }}>{r.converted || "—"}</td>
                    <td className="tnum" style={{ ...td, color: r.rejected > 0 ? "var(--red-fg)" : "var(--text-3)" }}>{r.rejected || "—"}</td>
                    <td className="tnum" style={{ ...td, fontWeight: 600, color: rate >= 0.3 ? "var(--green-fg)" : rate > 0 ? "var(--ink)" : "var(--text-3)" }}>
                      {r.converted > 0 ? `${Math.round(rate * 100)} %` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 10.5, color: "var(--text-3)", margin: "8px 0 6px", lineHeight: 1.6 }}>
            Calculé sur les dossiers affichés — le filtre par programme et par statut s&apos;y applique.
            Le <b>taux d&apos;aboutissement</b> rapporte les dossiers convertis en participation au total reçu de cette source :
            une source prolifique qui n&apos;aboutit jamais coûte du temps, une source discrète qui convertit mérite d&apos;être entretenue.
          </div>
        </div>
      )}
    </div>
  );
}
