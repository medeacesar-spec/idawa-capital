import Link from "next/link";
import { getEsgOverview } from "@/lib/data/esg";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDate(d: string | null) { if (!d) return "—"; return `${d.slice(8, 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`; }
const RISK_COLOR: Record<string, [string, string]> = { "C": ["var(--green-bg)", "var(--green-fg)"], "B": ["var(--amber-bg)", "var(--amber-fg)"], "A": ["var(--red-bg)", "var(--red-fg)"] };
const RISK_LABEL: Record<string, string> = { A: "A · élevé", B: "B · modéré", C: "C · faible" };
const CAT_COLOR: Record<string, string> = { E: "#3B6D11", S: "#185FA5", G: "#8A5A18" };

const STEPS = [["1", "Ouverture", "COD"], ["2", "Rating d'impact", "Avant invest."], ["3", "Due Diligence", "Instruction"], ["4", "Bilan DD", "Comité invest."], ["5", "Plan d'actions", "Suivi semestriel"]];

const panel: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" };
const h3: React.CSSProperties = { fontSize: 13, fontWeight: 600, margin: "0 0 12px", color: "var(--ink)" };

export default async function EsgPage() {
  const o = await getEsgOverview();
  const doneRate = o.actionsTotal ? Math.round((o.actionsDone / o.actionsTotal) * 100) : 0;
  const impactPct = o.impactMax ? Math.round((o.impactScore / o.impactMax) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span className="badge" style={{ background: "var(--surface-cream)", color: "var(--espresso)" }}>Méthodologie I&P / IPDEV 2 · Normes IFC (PS1–PS8)</span>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>Consolidation du portefeuille — l'ESG se saisit dans chaque fiche société (onglet ESG).</span>
      </div>

      {/* Chiffres-clés */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div style={panel}><div style={{ fontSize: 11, color: "var(--text-2)" }}>Sociétés évaluées</div><div className="serif tnum" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{o.companiesRated}<span style={{ fontSize: 13, color: "var(--text-3)" }}> / {o.companiesTotal}</span></div></div>
        <div style={panel}><div style={{ fontSize: 11, color: "var(--text-2)" }}>Avancement des plans d'action</div><div className="serif tnum" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{doneRate}%</div><div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{o.actionsDone} / {o.actionsTotal} réalisées</div></div>
        <div style={panel}><div style={{ fontSize: 11, color: "var(--text-2)" }}>Actions en retard</div><div className="serif tnum" style={{ fontSize: 22, fontWeight: 600, color: o.overdue.length ? "var(--red-fg)" : "var(--green-fg)", marginTop: 4 }}>{o.overdue.length}</div></div>
        <div style={panel}><div style={{ fontSize: 11, color: "var(--text-2)" }}>Score d'impact cumulé</div><div className="serif tnum" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{o.impactScore}<span style={{ fontSize: 13, color: "var(--text-3)" }}> / {o.impactMax}</span></div><div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{impactPct}%</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 13, marginBottom: 14 }}>
        {/* Répartition des risques */}
        <div style={panel}>
          <h3 style={h3}>Répartition par catégorie de risque E&S</h3>
          {o.byRisk.map((r) => {
            const c = RISK_COLOR[r.level] ?? ["var(--neutral-bg)", "var(--neutral-fg)"];
            const max = Math.max(1, ...o.byRisk.map((x) => x.count));
            return (
              <div key={r.level} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                <span className="badge" style={{ background: c[0], color: c[1], minWidth: 74, textAlign: "center" }}>{RISK_LABEL[r.level] ?? r.level}</span>
                <div style={{ flex: 1, height: 8, background: "var(--cream)", borderRadius: 4 }}><div style={{ width: `${(r.count / max) * 100}%`, height: "100%", background: c[1], borderRadius: 4 }} /></div>
                <span className="tnum" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", minWidth: 18, textAlign: "right" }}>{r.count}</span>
              </div>
            );
          })}
          {o.companiesRated === 0 && <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 6 }}>Aucune société encore évaluée. Renseignez le diagnostic E&S dans les fiches société.</div>}
        </div>

        {/* Actions en retard */}
        <div style={panel}>
          <h3 style={h3}>Actions E&S en retard <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— à traiter en priorité</span></h3>
          {o.overdue.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-3)", padding: "10px 0" }}>Aucune action en retard. 👍</div>
          ) : (
            <div>
              {o.overdue.map((a, i) => (
                <Link key={i} href={`/portefeuille/${a.companyId}`} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep-2)", textDecoration: "none" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, background: `${CAT_COLOR[a.category ?? ""] ?? "#6B5744"}1a`, color: CAT_COLOR[a.category ?? ""] ?? "#6B5744", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{a.category ?? "?"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.action}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{a.companyName} · échéance {frDate(a.dateEndPlan)}</div>
                  </div>
                  <span className="badge badge-red">En retard</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Processus (référence) */}
      <div style={panel}>
        <h3 style={h3}>Processus ESG — 5 étapes</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STEPS.map((s) => (
            <div key={s[0]} style={{ flex: "1 1 130px", background: "var(--surface-cream)", borderRadius: 10, padding: "9px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--espresso)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s[0]}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{s[1]}</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3, paddingLeft: 25 }}>{s[2]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
