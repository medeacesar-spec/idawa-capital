"use client";

// Tableau des dépôts (feuille de route, phase 2) : pour chaque entreprise suivie, la période en
// cours, son échéance et son statut. « Déposé » (V0, V1…) s'ajoutera avec la page de dépôt.

import Link from "next/link";
import { calendarFor, formatDay, type ReportingSetup } from "@/lib/reporting/calendar";

export type BoardRow = { companyId: string; name: string; charge: string | null; suppleant: string | null; referent: string | null; setup: ReportingSetup };

const STYLE: Record<string, { bg: string; fg: string }> = {
  "à venir": { bg: "var(--surface-cream)", fg: "var(--text-2)" },
  "ouverte": { bg: "#F7ECD6", fg: "#8A5A12" },
  "en retard": { bg: "#F6E1DC", fg: "#A6412E" },
};

export default function DepositsBoard({ rows, unconfigured }: { rows: BoardRow[]; unconfigured: { id: string; name: string }[] }) {
  const year = new Date().getFullYear();
  const lines = rows.map((r) => {
    const cal = [...calendarFor(r.setup, year - 1), ...calendarFor(r.setup, year), ...calendarFor(r.setup, year + 1)];
    const late = cal.filter((p) => p.state === "en retard");
    const current = cal.find((p) => p.state === "ouverte") ?? cal.find((p) => p.state === "à venir") ?? null;
    return { ...r, late, current };
  }).sort((a, b) => b.late.length - a.late.length || a.name.localeCompare(b.name, "fr"));

  return (
    <div>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 12, lineHeight: 1.6 }}>
        Qui doit déposer quoi, et pour quand. Le paramétrage se fait sur la fiche de chaque entreprise (Suivi &amp; gouvernance → Reporting entreprise).
      </div>
      <div className="card" style={{ padding: "2px 18px" }}>
        {lines.length === 0 && <div style={{ padding: 22, textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucune entreprise n&apos;a encore de suivi paramétré.</div>}
        {lines.map((l, i) => (
          <div key={l.companyId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: i ? "1px solid var(--sep)" : "none", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <Link href={`/portefeuille/${l.companyId}`} style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>{l.name}</Link>
              <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                Référent : {l.referent ?? "à renseigner"} · Suivi : {l.charge ?? "à désigner"}{l.suppleant ? ` (suppléant : ${l.suppleant})` : ""}
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)", minWidth: 200 }}>
              {l.current ? <>{l.current.label} · échéance {formatDay(l.current.due)}</> : "Aucune période attendue"}
            </div>
            {l.current && <span className="badge" style={{ background: STYLE[l.current.state].bg, color: STYLE[l.current.state].fg }}>{l.current.state}</span>}
            {l.late.length > 0 && <span className="badge" style={{ background: STYLE["en retard"].bg, color: STYLE["en retard"].fg }}>{l.late.length} période{l.late.length > 1 ? "s" : ""} en retard</span>}
          </div>
        ))}
      </div>
      {unconfigured.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 10 }}>
          Sans paramétrage : {unconfigured.map((c, i) => <span key={c.id}>{i ? ", " : ""}<Link href={`/portefeuille/${c.id}`} style={{ color: "var(--camel)" }}>{c.name}</Link></span>)}
        </div>
      )}
    </div>
  );
}
