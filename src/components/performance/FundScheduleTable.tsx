"use client";

// Vue de trésorerie du fonds : ce qui doit rentrer, et ce qui aurait dû rentrer.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtM } from "@/lib/format";
import { INSTRUMENT_TYPES } from "@/lib/ui-constants";
import type { FundSchedule, ScheduleEntry } from "@/lib/data/fundSchedule";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const frDay = (d: string) => `${d.slice(8, 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`;
const frMonth = (m: string) => `${MONTHS[parseInt(m.slice(5, 7), 10) - 1] ?? ""} ${m.slice(2, 4)}`;
const typeLabel = (t: string) => INSTRUMENT_TYPES.find((x) => x.key === t)?.label ?? t;

export default function FundScheduleTable({ data }: { data: FundSchedule }) {
  const router = useRouter();
  const [view, setView] = useState<"upcoming" | "arrears">(data.totalArrears > 0.5 ? "arrears" : "upcoming");

  const rows = view === "arrears" ? data.arrears : data.upcoming;
  const peak = Math.max(1, ...data.byMonth.map((b) => b.amount));

  const th: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "6px 8px", fontSize: 12, color: "var(--ink)", whiteSpace: "nowrap" };

  const tiles: [string, string, string, boolean][] = [
    ["Arriérés", fmtM(data.totalArrears), data.companiesInArrears > 0 ? `${data.companiesInArrears} société${data.companiesInArrears > 1 ? "s" : ""}` : "aucun", data.totalArrears > 0.5],
    ["Attendu sur 12 mois", fmtM(data.next12), `${data.upcoming.length} échéance${data.upcoming.length > 1 ? "s" : ""}`, false],
    ["Prochain mois", fmtM(data.byMonth[0]?.amount ?? 0), data.byMonth[0] ? frMonth(data.byMonth[0].month) : "—", false],
  ];

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>
        Échéancier consolidé du fonds <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— toutes sociétés confondues, pour planifier la trésorerie</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
        {tiles.map(([k, v, sub, alert]) => (
          <div key={k} style={{ background: "var(--surface)", border: `1px solid ${alert ? "var(--red-fg)" : "var(--border)"}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-2)" }}>{k}</div>
            <div className="serif tnum" style={{ fontSize: 17, fontWeight: 600, color: alert ? "var(--red-fg)" : "var(--ink)", marginTop: 4 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {data.byMonth.length > 0 && (
        <div className="card" style={{ padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-2)", marginBottom: 10 }}>Profil des encaissements attendus</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90 }}>
            {data.byMonth.map((b) => (
              <div key={b.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}
                title={`${frMonth(b.month)} — ${fmtM(b.amount)}`}>
                <div style={{ width: "100%", height: `${(b.amount / peak) * 68}px`, background: "var(--espresso)", borderRadius: "4px 4px 0 0", minHeight: 2 }} />
                <div style={{ fontSize: 9, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{frMonth(b.month)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "inline-flex", gap: 2, background: "var(--surface-cream)", border: "1px solid var(--border)", borderRadius: 999, padding: 3, marginBottom: 10 }}>
        {([["arrears", `Arriérés (${data.arrears.length})`], ["upcoming", `À venir (${data.upcoming.length})`]] as const).map(([k, label]) => {
          const on = k === view;
          return (
            <button key={k} onClick={() => setView(k)}
              style={{ padding: "6px 14px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none",
                background: on ? "var(--espresso)" : "transparent", color: on ? "#fff" : "var(--text-2)" }}>
              {label}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ padding: "24px", textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>
          {view === "arrears" ? "Aucun arriéré : toutes les échéances échues sont soldées." : "Aucune échéance sur les douze prochains mois."}
        </div>
      ) : (
        <div className="card" style={{ padding: "6px 14px", overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 620 }}>
            <thead>
              <tr>
                <th style={th}>Échéance</th>
                <th style={th}>Société</th>
                <th style={th}>Financement</th>
                <th style={{ ...th, textAlign: "right" }}>{view === "arrears" ? "Reste dû" : "Montant attendu"}</th>
                <th style={th}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e: ScheduleEntry) => (
                <tr key={`${e.instrumentId}-${e.periodNo}`}
                  onClick={() => router.push(`/portefeuille/${e.companyId}`)}
                  style={{ borderTop: "1px solid var(--sep)", cursor: "pointer" }}>
                  <td style={td}>{frDay(e.dueDate)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{e.companyName}</td>
                  <td style={{ ...td, color: "var(--text-2)" }}>
                    {e.instrumentLabel} <span style={{ color: "var(--text-3)", fontSize: 10.5 }}>· {typeLabel(e.instrumentType)}</span>
                  </td>
                  <td className="tnum" style={{ ...td, textAlign: "right", fontWeight: 600, color: view === "arrears" ? "var(--red-fg)" : "var(--ink)" }}>{fmtM(e.amount)}</td>
                  <td style={td}>
                    <span className={`badge ${e.status === "manquée" ? "badge-red" : e.status === "partielle" ? "badge-amber" : "badge-neutral"}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 8, lineHeight: 1.6 }}>
        Les sociétés sorties ou radiées sont exclues. Une échéance « non saisie » est passée sans information : elle compte
        dans les arriérés comme <b>reste à documenter</b>, pas comme impayé avéré. Cliquez une ligne pour ouvrir la société.
      </div>
    </div>
  );
}
