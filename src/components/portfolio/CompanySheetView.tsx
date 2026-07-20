"use client";

// Rendu imprimable de la fiche entreprise trimestrielle (format I&P / IPDEV).
// Une page A4 par défaut, sans navigation à l'impression : le bouton « Imprimer »
// ouvre la boîte du navigateur, d'où l'on enregistre en PDF.

import { useRouter } from "next/navigation";
import { fmtFCFA, fmtInt, fmtMult, fmtPct } from "@/lib/format";
import { nextPeriod, previousPeriod } from "@/lib/periods";
import type { CompanySheet, SheetLine } from "@/lib/reporting/companySheet";

const DASH = "—";

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : DASH);

function fmtLine(v: number | null, unit: SheetLine["unit"]) {
  if (v == null) return DASH;
  return unit === "%" ? fmtPct(v) : fmtFCFA(v);
}

/** Écart relatif entre deux valeurs, avec le symbole de tendance. */
function Delta({ actual, base }: { actual: number | null; base: number | null }) {
  if (actual == null || base == null || base === 0) return <span style={{ color: "var(--text-2)" }}>{DASH}</span>;
  const pct = ((actual - base) / Math.abs(base)) * 100;
  const stable = Math.abs(pct) < 2; // en deçà de 2 %, on considère que le chiffre n'a pas bougé
  const color = stable ? "var(--text-2)" : pct > 0 ? "var(--green-fg)" : "var(--red-fg)";
  const sign = stable ? "▬" : pct > 0 ? "▲" : "▼";
  return (
    <span className="tnum" style={{ color, fontSize: 11.5 }} title={`${pct > 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")} %`}>
      {sign} {stable ? "stable" : `${pct > 0 ? "+" : ""}${Math.round(pct)} %`}
    </span>
  );
}

// Les sections se numérotent elles-mêmes : selon le type de suivi, certaines sautent
// (une entreprise accélérée n'a ni investissement ni remboursements) et une numérotation
// écrite à la main finirait par sauter un chiffre.
function makeNumbering() {
  let n = 0;
  return () => ++n;
}

function Section({ title, note, num, children }: { title: string; note?: string; num: number; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 20, breakInside: "avoid" }}>
      <h2 className="serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: "0 0 2px", borderBottom: "1px solid var(--border-strong)", paddingBottom: 5 }}>
        {num}. {title}
      </h2>
      {note && <div style={{ fontSize: 10.5, color: "var(--text-2)", margin: "4px 0 0" }}>{note}</div>}
      <div style={{ marginTop: 9 }}>{children}</div>
    </section>
  );
}

function Facts({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
      {items.map(([k, v]) => (
        <div key={k} style={{ border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px", background: "var(--surface-cream)" }}>
          <div style={{ fontSize: 10, color: "var(--text-2)" }}>{k}</div>
          <div className="serif tnum" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", fontSize: 10.5, fontWeight: 600, color: "var(--text-2)", padding: "5px 8px", borderBottom: "1px solid var(--border-strong)" };
const td: React.CSSProperties = { fontSize: 11.5, color: "var(--ink)", padding: "5px 8px", borderBottom: "1px solid var(--sep)" };
const tdNum: React.CSSProperties = { ...td, textAlign: "right" };

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, color: "var(--text-2)", fontStyle: "italic" }}>{children}</div>;
}

export default function CompanySheetView({ sheet, editedBy }: { sheet: CompanySheet; editedBy: string }) {
  const router = useRouter();
  const go = (p: string) => router.push(`?t=${p}`);
  const equity = sheet.identity.trackingType === "equity";
  const no = makeNumbering();

  return (
    <div>
      {/* Barre d'outils — absente du document imprimé */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => router.back()}>← Retour à la fiche</button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <button className="btn btn-ghost" onClick={() => go(previousPeriod(sheet.period))} aria-label="Trimestre précédent">‹</button>
          <span className="serif tnum" style={{ fontSize: 14, fontWeight: 600, minWidth: 78, textAlign: "center" }}>{sheet.period}</span>
          <button className="btn btn-ghost" onClick={() => go(nextPeriod(sheet.period))} aria-label="Trimestre suivant">›</button>
        </div>
        <button className="btn" onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>
      </div>

      {/* Document */}
      <div className="card" style={{ padding: "30px 34px", maxWidth: 860, margin: "0 auto", background: "#fff" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, borderBottom: "2px solid var(--espresso)", paddingBottom: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--camel)", fontWeight: 600 }}>
              Fiche de suivi trimestrielle
            </div>
            <h1 className="serif" style={{ fontSize: 24, fontWeight: 600, color: "var(--ink)", margin: "3px 0 4px" }}>{sheet.identity.name}</h1>
            <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>
              {[sheet.identity.sector, ...sheet.identity.programs].filter(Boolean).join(" · ") || DASH}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-2)", lineHeight: 1.6 }}>
            <div className="serif tnum" style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>{sheet.period}</div>
            <div>{fmtDate(sheet.from)} → {fmtDate(sheet.to)}</div>
            <div>Idawa Capital</div>
            <div>Édité le {new Date().toLocaleDateString("fr-FR")} par {editedBy}</div>
          </div>
        </header>

        <Section num={no()} title="Identité et rattachement">
          <Facts items={[
            ["Statut", sheet.identity.status],
            ["Suivi", equity ? "Participation" : "Accélération"],
            ["Entrée au portefeuille", fmtDate(sheet.identity.investedDate)],
            ["Secteur EHS (IFC)", sheet.esg.ehsSector ?? DASH],
          ]} />
        </Section>

        {equity && (
          <Section num={no()} title="Investissement et valorisation">
            <Facts items={[
              ["Investi", fmtFCFA(sheet.investment.invested)],
              ["Valorisation retenue", fmtFCFA(sheet.investment.valuation)],
              ["Multiple (TVPI)", fmtMult(sheet.investment.tvpi)],
              ["Détention", sheet.investment.ownership != null ? fmtPct(sheet.investment.ownership) : DASH],
            ]} />
            {sheet.investment.instruments.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
                <thead><tr><th style={th}>Instrument</th><th style={th}>Octroi</th><th style={{ ...th, textAlign: "right" }}>Engagé</th><th style={{ ...th, textAlign: "right" }}>Décaissé</th></tr></thead>
                <tbody>
                  {sheet.investment.instruments.map((i, n) => (
                    <tr key={n}>
                      <td style={td}>{i.type}{i.label ? ` — ${i.label}` : ""}</td>
                      <td style={td}>{fmtDate(i.grantDate)}</td>
                      <td style={tdNum} className="tnum">{i.committed != null ? fmtFCFA(i.committed) : DASH}</td>
                      <td style={tdNum} className="tnum">{i.disbursed != null ? fmtFCFA(i.disbursed) : DASH}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {(sheet.investment.valuationMethods.length > 0 || sheet.investment.exitScenarios.length > 0) && (
              <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 8, lineHeight: 1.7 }}>
                {sheet.investment.valuationMethods.length > 0 && <div><strong style={{ color: "var(--ink)" }}>Méthodes de valorisation :</strong> {sheet.investment.valuationMethods.join(", ")}</div>}
                {sheet.investment.exitScenarios.length > 0 && <div><strong style={{ color: "var(--ink)" }}>Pistes de sortie :</strong> {sheet.investment.exitScenarios.join(", ")}{sheet.investment.exitYear ? ` (horizon ${sheet.investment.exitYear})` : ""}</div>}
              </div>
            )}
          </Section>
        )}

        {sheet.debt && (
          <Section num={no()} title="Remboursements" note="Un champ vide n'est pas un impayé : les échéances sans information sont comptées à part.">
            <Facts items={[
              ["Capital restant dû", fmtFCFA(sheet.debt.outstanding)],
              ["Arriérés", sheet.debt.arrears > 0 ? fmtFCFA(sheet.debt.arrears) : "aucun"],
              ["Prochaine échéance", sheet.debt.nextDue ? `${fmtDate(sheet.debt.nextDue.date)} · ${fmtFCFA(sheet.debt.nextDue.amount)}` : DASH],
              ["Ponctualité", sheet.debt.behaviour.reliability != null ? fmtPct(sheet.debt.behaviour.reliability * 100) : DASH],
            ]} />
            <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 8 }}>
              {sheet.debt.behaviour.tracked} échéance(s) renseignée(s) : {sheet.debt.behaviour.onTime} à l'heure, {sheet.debt.behaviour.late} en retard
              {sheet.debt.behaviour.avgDaysLate != null ? ` (${sheet.debt.behaviour.avgDaysLate} j en moyenne)` : ""}, {sheet.debt.behaviour.partial} partielle(s), {sheet.debt.behaviour.missed} manquée(s).
              {sheet.debt.behaviour.unrecorded > 0 && ` ${sheet.debt.behaviour.unrecorded} échéance(s) échue(s) sans information.`}
            </div>
          </Section>
        )}

        <Section num={no()} title={`Situation financière — exercice ${sheet.financials.year}`}
          note="Source : états financiers OHADA saisis ; repli sur la grille Budget & BP lorsque l'exercice n'est pas encore déposé.">
          {sheet.financials.hasData ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Poste</th>
                  <th style={{ ...th, textAlign: "right" }}>{sheet.financials.year}</th>
                  <th style={{ ...th, textAlign: "right" }}>{sheet.financials.year - 1}</th>
                  <th style={{ ...th, textAlign: "right" }}>vs N-1</th>
                  <th style={{ ...th, textAlign: "right" }}>Budget</th>
                  <th style={{ ...th, textAlign: "right" }}>vs budget</th>
                </tr>
              </thead>
              <tbody>
                {sheet.financials.lines.map((l) => (
                  <tr key={l.label}>
                    <td style={td}>{l.label}</td>
                    <td style={tdNum} className="tnum">{fmtLine(l.actual, l.unit)}</td>
                    <td style={tdNum} className="tnum">{fmtLine(l.previous, l.unit)}</td>
                    <td style={tdNum}><Delta actual={l.actual} base={l.previous} /></td>
                    <td style={tdNum} className="tnum">{fmtLine(l.budget, l.unit)}</td>
                    <td style={tdNum}><Delta actual={l.actual} base={l.budget} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>Aucun état financier ni budget saisi pour {sheet.financials.year}.</Empty>
          )}
        </Section>

        <Section num={no()} title="Indicateurs de suivi" note={`Dernière valeur connue au ${sheet.period}.`}>
          {sheet.kpis.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Indicateur</th><th style={th}>Famille</th><th style={{ ...th, textAlign: "right" }}>Valeur</th><th style={{ ...th, textAlign: "right" }}>Cible</th><th style={th}>Période</th></tr></thead>
              <tbody>
                {sheet.kpis.map((k) => (
                  <tr key={k.name}>
                    <td style={td}>{k.name}</td>
                    <td style={{ ...td, color: "var(--text-2)" }}>{k.category}</td>
                    <td style={{ ...tdNum, color: k.onTarget === false ? "var(--red-fg)" : "var(--ink)" }} className="tnum">
                      {k.value != null ? `${fmtInt(k.value)}${k.unit ? ` ${k.unit}` : ""}` : DASH}
                    </td>
                    <td style={tdNum} className="tnum">{k.target != null ? fmtInt(k.target) : DASH}</td>
                    <td style={{ ...td, color: "var(--text-2)" }}>{k.period ?? DASH}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>Aucun indicateur suivi sur cette entreprise.</Empty>}
        </Section>

        {sheet.support && sheet.support.rows.length > 0 && (
          <Section num={no()} title="Accompagnement" note={`${sheet.support.programName ?? "Programme"} — valeurs du trimestre. Le cumul ne porte que sur ce qui s'additionne.`}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Indicateur</th><th style={th}>Catégorie</th>
                  <th style={{ ...th, textAlign: "right" }}>{sheet.period}</th>
                  <th style={{ ...th, textAlign: "right" }}>Trimestre précédent</th>
                  <th style={{ ...th, textAlign: "right" }}>Cumul</th>
                  <th style={{ ...th, textAlign: "right" }}>Cible</th>
                </tr>
              </thead>
              <tbody>
                {sheet.support.rows.map((r) => (
                  <tr key={r.name}>
                    <td style={td}>{r.name}</td>
                    <td style={{ ...td, color: "var(--text-2)" }}>{r.category}</td>
                    <td style={tdNum} className="tnum">{r.value != null ? `${fmtInt(r.value)}${r.unit ? ` ${r.unit}` : ""}` : DASH}</td>
                    <td style={{ ...tdNum, color: "var(--text-2)" }} className="tnum">{r.previous != null ? fmtInt(r.previous) : DASH}</td>
                    <td style={tdNum} className="tnum">{r.cumul != null ? fmtInt(r.cumul) : DASH}</td>
                    <td style={{ ...tdNum, color: "var(--text-2)" }} className="tnum">{r.target != null ? fmtInt(r.target) : DASH}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <Section num={no()} title="ESG & impact">
          <Facts items={[
            ["Catégorie de risque E&S", sheet.esg.riskCategory ?? DASH],
            ["Liste d'exclusion", sheet.esg.exclusionOk == null ? DASH : sheet.esg.exclusionOk ? "conforme" : "point d'attention"],
            ["Notation d'impact IPDEV2", sheet.esg.impactScore != null ? `${sheet.esg.impactScore} / ${sheet.esg.impactMax}` : DASH],
            ["Plan d'action E&S", sheet.esg.actionsTotal ? `${sheet.esg.actionsDone} / ${sheet.esg.actionsTotal} réalisées` : DASH],
          ]} />
          {sheet.esg.impactFigures.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", margin: "10px 0 4px" }}>
                Indicateurs d&apos;impact — questionnaire {sheet.esg.impactYear}
              </div>
              <Facts items={sheet.esg.impactFigures.map((fg) => [fg.label, fg.value] as [string, string])} />
            </>
          )}
          {sheet.esg.actionsLate.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--red-fg)", margin: "10px 0 4px" }}>Actions E&S en retard</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {sheet.esg.actionsLate.map((a, n) => (
                    <tr key={n}>
                      <td style={{ ...td, width: 84, color: "var(--text-2)" }}>{fmtDate(a.date)}</td>
                      <td style={{ ...td, width: 34, color: "var(--text-2)" }}>{a.kind}</td>
                      <td style={td}>{a.label}</td>
                      <td style={{ ...td, width: 90, color: "var(--text-2)" }}>{a.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Section>

        <Section num={no()} title="Faits marquants du trimestre" note="Décisions de comité et comptes rendus datés dans la période.">
          {sheet.events.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {sheet.events.map((e, n) => (
                  <tr key={n}>
                    <td style={{ ...td, width: 84, color: "var(--text-2)", verticalAlign: "top" }}>{fmtDate(e.date)}</td>
                    <td style={{ ...td, width: 150, verticalAlign: "top" }}>{e.kind}</td>
                    <td style={{ ...td, verticalAlign: "top" }}>{e.label}{e.detail && <div style={{ color: "var(--text-2)", fontSize: 10.5, marginTop: 2 }}>{e.detail}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>Aucun événement enregistré sur ce trimestre.</Empty>}
        </Section>

        <Section num={no()} title="Actions ouvertes et création de valeur">
          {sheet.openTasks.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Échéance</th><th style={th}>Action</th><th style={th}>Responsable</th><th style={th}>Statut</th></tr></thead>
              <tbody>
                {sheet.openTasks.map((t, n) => (
                  <tr key={n}>
                    <td style={{ ...td, width: 84, color: (t.date && t.date < new Date().toISOString().slice(0, 10)) ? "var(--red-fg)" : "var(--text-2)" }}>{fmtDate(t.date)}</td>
                    <td style={td}>{t.label}</td>
                    <td style={{ ...td, color: "var(--text-2)" }}>{t.detail ?? DASH}</td>
                    <td style={{ ...td, color: "var(--text-2)" }}>{t.kind}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>Aucune action ouverte — cette entreprise n&apos;a pas de suite programmée.</Empty>}

          {sheet.valueCreation.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", margin: "12px 0 4px" }}>Initiatives de création de valeur en cours</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {sheet.valueCreation.map((v, n) => (
                    <tr key={n}>
                      <td style={{ ...td, width: 84, color: "var(--text-2)" }}>{fmtDate(v.targetDate)}</td>
                      <td style={{ ...td, width: 150, color: "var(--text-2)" }}>{v.lever ?? DASH}</td>
                      <td style={td}>{v.initiative}</td>
                      <td style={{ ...td, width: 110, color: "var(--text-2)" }}>{v.owner ?? DASH}</td>
                      <td style={{ ...td, width: 90, color: "var(--text-2)" }}>{v.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Section>

        {sheet.contacts.length > 0 && (
          <Section num={no()} title="Interlocuteurs">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {sheet.contacts.map((c, n) => (
                  <tr key={n}>
                    <td style={td}>{c.name}</td>
                    <td style={{ ...td, color: "var(--text-2)" }}>{c.function ?? DASH}</td>
                    <td style={{ ...td, color: "var(--text-2)" }}>{c.email ?? DASH}</td>
                    <td style={{ ...td, color: "var(--text-2)" }}>{c.phone ?? DASH}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <footer style={{ borderTop: "1px solid var(--border)", paddingTop: 9, marginTop: 6, fontSize: 10, color: "var(--text-2)", display: "flex", justifyContent: "space-between" }}>
          <span>Idawa Capital · fiche de suivi {sheet.period} · {sheet.identity.name}</span>
          <span>Montants en FCFA</span>
        </footer>
      </div>
    </div>
  );
}
