"use client";

// Rapport ESG & Impact annuel — rendu imprimable, dans l'ordre du modèle IPDEV.
//
// Ce document donne la MATIÈRE CHIFFRÉE du rapport : les six parties du modèle, avec
// les agrégats du fonds et la revue par entreprise. Le récit, les portraits
// d'entrepreneurs et les études de cas restent à écrire — le modèle les attend, l'outil
// ne les invente pas.

import { useRouter } from "next/navigation";
import { fmtFCFA, fmtInt, fmtPct } from "@/lib/format";
import type { EsgAnnualReport, Breakdown } from "@/lib/data/esgAnnualReport";

const DASH = "—";

function Part({ n, title, subtitle, children }: { n: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24, breakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, borderBottom: "1px solid var(--border-strong)", paddingBottom: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "var(--camel)", textTransform: "uppercase" }}>Partie {n}</span>
        <h2 className="serif" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{title}</h2>
      </div>
      {subtitle && <div style={{ fontSize: 10.5, color: "var(--text-2)", marginBottom: 10 }}>{subtitle}</div>}
      {children}
    </section>
  );
}

function Tiles({ items }: { items: [string, string, string?][] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)`, gap: 9 }}>
      {items.map(([k, v, sub]) => (
        <div key={k} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--surface-cream)" }}>
          <div style={{ fontSize: 10, color: "var(--text-2)" }}>{k}</div>
          <div className="serif tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{v}</div>
          {sub && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>}
        </div>
      ))}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", fontSize: 10, fontWeight: 600, color: "var(--text-2)", padding: "5px 8px", borderBottom: "1px solid var(--border-strong)" };
const td: React.CSSProperties = { fontSize: 11.5, color: "var(--ink)", padding: "5px 8px", borderBottom: "1px solid var(--sep)" };
const tdR: React.CSSProperties = { ...td, textAlign: "right" };

/** Répartition en nombre ET en montant : le modèle IPDEV demande les deux. */
function BreakdownTable({ rows, title }: { rows: Breakdown[]; title: string }) {
  const totalCount = rows.reduce((s, r) => s + r.count, 0);
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  if (!rows.length) return <div style={{ fontSize: 11.5, color: "var(--text-2)", fontStyle: "italic" }}>Aucune donnée.</div>;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", margin: "0 0 5px" }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th}>&nbsp;</th><th style={{ ...th, textAlign: "right" }}>PME</th><th style={{ ...th, textAlign: "right" }}>Part</th><th style={{ ...th, textAlign: "right" }}>Investi</th><th style={{ ...th, textAlign: "right" }}>Part</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td style={td}>{r.label}</td>
              <td style={tdR} className="tnum">{r.count}</td>
              <td style={{ ...tdR, color: "var(--text-2)" }} className="tnum">{totalCount ? fmtPct((r.count / totalCount) * 100) : DASH}</td>
              <td style={tdR} className="tnum">{fmtFCFA(r.amount)}</td>
              <td style={{ ...tdR, color: "var(--text-2)" }} className="tnum">{totalAmount ? fmtPct((r.amount / totalAmount) * 100) : DASH}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EsgAnnualReportView({ report, editedBy }: { report: EsgAnnualReport; editedBy: string }) {
  const router = useRouter();
  const r = report;
  const doneRate = r.esg.actionsTotal ? (r.esg.actionsDone / r.esg.actionsTotal) * 100 : null;

  const delta = (now: number | null, prev: number | null) => {
    if (now == null || prev == null || prev === 0) return null;
    const pct = ((now - prev) / prev) * 100;
    return { pct, up: pct >= 0 };
  };

  return (
    <div>
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => router.push("/esg")}>← ESG &amp; Impact</button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>Exercice</span>
          <select className="btn btn-ghost" value={r.year} onChange={(e) => router.push(`?annee=${e.target.value}`)}
            style={{ padding: "6px 10px", cursor: "pointer" }}>
            {r.years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button className="btn" onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>
      </div>

      <div className="card" style={{ padding: "30px 34px", maxWidth: 900, margin: "0 auto", background: "#fff" }}>
        <header style={{ borderBottom: "2px solid var(--espresso)", paddingBottom: 12, marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--camel)", fontWeight: 600 }}>
              Rapport ESG &amp; Impact annuel · modèle IPDEV
            </div>
            <h1 className="serif" style={{ fontSize: 25, fontWeight: 600, color: "var(--ink)", margin: "3px 0 4px" }}>Idawa Capital</h1>
            <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>Exercice {r.year}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-2)", lineHeight: 1.6 }}>
            <div className="serif tnum" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>{r.year}</div>
            <div>Édité le {new Date().toLocaleDateString("fr-FR")}</div>
            <div>par {editedBy}</div>
          </div>
        </header>

        <Part n="1" title="Résultats clés" subtitle="Le portefeuille à la clôture de l'exercice.">
          <Tiles items={[
            ["Participations actives", String(r.key.companies)],
            ["Entrées dans l'année", String(r.key.newThisYear), r.key.investedThisYear ? fmtFCFA(r.key.investedThisYear) : undefined],
            ["Sorties", String(r.key.exited)],
            ["Capital investi", fmtFCFA(r.key.invested)],
          ]} />
          <div style={{ marginTop: 9 }}>
            <Tiles items={[
              ["Entreprises accompagnées", String(r.key.accompanied)],
              ["Programmes actifs", String(r.key.programs)],
              ["Entreprises notées (impact)", String(r.esg.rated)],
              ["Actions E&S suivies", String(r.esg.actionsTotal)],
            ]} />
          </div>
        </Part>

        <Part n="2" title="Performances du fonds" subtitle="Répartitions en nombre de PME et en montant investi, comme le demande le modèle.">
          <div style={{ display: "grid", gap: 14 }}>
            <BreakdownTable rows={r.bySector} title="Par secteur" />
            <BreakdownTable rows={r.byProgram} title="Par programme" />
            {r.byCountry.length > 1 && <BreakdownTable rows={r.byCountry} title="Par pays" />}
          </div>
        </Part>

        <Part n="3" title="Résultats d'impact — emplois" subtitle="Comparaison avec l'exercice précédent, et nombre d'entreprises ayant renseigné la donnée.">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Indicateur</th><th style={{ ...th, textAlign: "right" }}>{r.year}</th><th style={{ ...th, textAlign: "right" }}>{r.year - 1}</th><th style={{ ...th, textAlign: "right" }}>Évolution</th><th style={{ ...th, textAlign: "right" }}>Entreprises</th></tr></thead>
            <tbody>
              {r.jobs.map((j) => {
                const d = delta(j.value, j.previous);
                return (
                  <tr key={j.label}>
                    <td style={td}>{j.label}</td>
                    <td style={tdR} className="tnum">{j.value != null ? fmtInt(j.value) : DASH}</td>
                    <td style={{ ...tdR, color: "var(--text-2)" }} className="tnum">{j.previous != null ? fmtInt(j.previous) : DASH}</td>
                    <td style={tdR} className="tnum">
                      {d ? <span style={{ color: d.up ? "var(--green-fg)" : "var(--red-fg)", fontSize: 11.5 }}>{d.up ? "▲" : "▼"} {Math.abs(Math.round(d.pct))} %</span> : <span style={{ color: "var(--text-3)" }}>{DASH}</span>}
                    </td>
                    <td style={{ ...tdR, color: "var(--text-2)" }} className="tnum">{j.companies || DASH}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Part>

        <Part n="4" title="Genre · Gouvernance · Formalisation · Environnement" subtitle="Les quatre thèmes transverses du modèle IPDEV.">
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", margin: "0 0 5px" }}>Genre</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
            <tbody>
              {r.gender.map((g) => (
                <tr key={g.label}>
                  <td style={td}>{g.label}</td>
                  <td style={tdR} className="tnum">
                    {g.value == null ? <span style={{ color: "var(--text-3)" }}>{DASH}</span> : g.unit === "%" ? fmtPct(g.value) : fmtInt(g.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", margin: "0 0 5px" }}>Gouvernance</div>
          <Tiles items={[
            ["Passages en comité", String(r.governance.committees)],
            ["Décisions validées", String(r.governance.validated)],
            ["Entreprises concernées", String(r.governance.companiesWithCommittee)],
            ["Actions E&S en retard", String(r.esg.actionsLate)],
          ]} />

          <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--amber-bg)", borderRadius: 9, fontSize: 11, color: "var(--amber-fg)" }}>
            <strong>Formalisation et Environnement</strong> — le modèle attend ici un taux de formalisation des
            emplois et des indicateurs environnementaux que l&apos;outil ne collecte pas encore. Voir la liste en fin de document.
          </div>
        </Part>

        <Part n="5" title="Approche ESG" subtitle="Notation des risques, rating d'impact IPDEV2 et avancement des plans d'action E&S.">
          <Tiles items={[
            ...r.esg.byRisk.map((b) => [`Risque E&S ${b.level}`, String(b.count)] as [string, string]),
            ["Actions réalisées", doneRate != null ? fmtPct(doneRate) : DASH, `${r.esg.actionsDone} / ${r.esg.actionsTotal}`],
          ]} />

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", margin: "0 0 5px" }}>
                Rating d&apos;impact IPDEV2 — moyenne {r.esg.impactAverage != null ? `${r.esg.impactAverage.toFixed(1).replace(".", ",")} / ${r.esg.impactMax}` : DASH}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {r.esg.impactByDimension.length ? r.esg.impactByDimension.map((d) => (
                    <tr key={d.dimension}>
                      <td style={td}>{d.dimension}</td>
                      <td style={tdR} className="tnum">{fmtInt(d.score)} / {fmtInt(d.max)}</td>
                    </tr>
                  )) : <tr><td style={{ ...td, color: "var(--text-3)", fontStyle: "italic" }}>Aucune notation saisie.</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", margin: "0 0 5px" }}>Plan d&apos;action E&amp;S par catégorie</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {r.esg.actionsByCategory.map((c) => (
                    <tr key={c.category}>
                      <td style={td}>{c.category}</td>
                      <td style={tdR} className="tnum">{c.done} / {c.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Part>

        <Part n="6" title="Revue du portefeuille" subtitle="Le modèle consacre deux diapositives par entreprise ; voici la ligne chiffrée de chacune.">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Entreprise</th><th style={th}>Secteur</th><th style={th}>Programme</th>
                <th style={{ ...th, textAlign: "right" }}>Investi</th>
                <th style={{ ...th, textAlign: "right" }}>Effectif</th>
                <th style={{ ...th, textAlign: "right" }}>Risque</th>
                <th style={{ ...th, textAlign: "right" }}>Impact</th>
                <th style={{ ...th, textAlign: "right" }}>Actions E&amp;S</th>
              </tr>
            </thead>
            <tbody>
              {r.companies.map((c) => (
                <tr key={c.id}>
                  <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
                  <td style={{ ...td, color: "var(--text-2)", fontSize: 11 }}>{c.sector ?? DASH}</td>
                  <td style={{ ...td, color: "var(--text-2)", fontSize: 11 }}>{c.program ?? DASH}</td>
                  <td style={tdR} className="tnum">{fmtFCFA(c.invested)}</td>
                  <td style={tdR} className="tnum">{c.headcount != null ? fmtInt(c.headcount) : DASH}</td>
                  <td style={tdR}>{c.riskCategory ?? DASH}</td>
                  <td style={tdR} className="tnum">{c.impactScore != null ? `${fmtInt(c.impactScore)}/${fmtInt(c.impactMax ?? 0)}` : DASH}</td>
                  <td style={tdR} className="tnum">{c.actionsTotal ? `${c.actionsDone}/${c.actionsTotal}` : DASH}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Part>

        <section style={{ breakInside: "avoid", border: "1px solid var(--border-strong)", borderRadius: 11, padding: "14px 16px", background: "var(--surface-cream)" }}>
          <div className="serif" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>
            Ce que le modèle attend et que l&apos;outil ne produit pas encore
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-2)", marginBottom: 9 }}>
            Ces rubriques supposent un questionnaire d&apos;impact annuel par PME. Elles sont signalées plutôt que laissées vides sans explication.
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {r.missing.map((m) => (
                <tr key={m.label}>
                  <td style={{ ...td, width: "38%", fontWeight: 600 }}>{m.label}</td>
                  <td style={{ ...td, color: "var(--text-2)", fontSize: 11 }}>{m.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer style={{ borderTop: "1px solid var(--border)", paddingTop: 9, marginTop: 14, fontSize: 10, color: "var(--text-2)", display: "flex", justifyContent: "space-between" }}>
          <span>Idawa Capital · Rapport ESG &amp; Impact {r.year} · matière chiffrée</span>
          <span>Montants en FCFA</span>
        </footer>
      </div>
    </div>
  );
}
