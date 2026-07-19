"use client";

// Rendu imprimable de la fiche d'instruction d'un dossier (pendant de la fiche société).

import { useRouter } from "next/navigation";
import { fmtInt, fmtPct } from "@/lib/format";
import type { DealSheet } from "@/lib/reporting/dealSheet";

const DASH = "—";
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : DASH);

function Section({ num, title, note, children }: { num: number; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 20, breakInside: "avoid" }}>
      <h2 className="serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: "0 0 2px", borderBottom: "1px solid var(--border-strong)", paddingBottom: 5 }}>{num}. {title}</h2>
      {note && <div style={{ fontSize: 10.5, color: "var(--text-2)", margin: "4px 0 0" }}>{note}</div>}
      <div style={{ marginTop: 9 }}>{children}</div>
    </section>
  );
}

const th: React.CSSProperties = { textAlign: "left", fontSize: 10.5, fontWeight: 600, color: "var(--text-2)", padding: "5px 8px", borderBottom: "1px solid var(--border-strong)" };
const td: React.CSSProperties = { fontSize: 11.5, color: "var(--ink)", padding: "5px 8px", borderBottom: "1px solid var(--sep)" };
const tdR: React.CSSProperties = { ...td, textAlign: "right" };
const Empty = ({ children }: { children: React.ReactNode }) => <div style={{ fontSize: 11.5, color: "var(--text-2)", fontStyle: "italic" }}>{children}</div>;

export default function DealSheetView({ sheet, editedBy }: { sheet: DealSheet; editedBy: string }) {
  const router = useRouter();
  const s = sheet;

  return (
    <div>
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => router.back()}>← Retour au dossier</button>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>
      </div>

      <div className="card" style={{ padding: "30px 34px", maxWidth: 860, margin: "0 auto", background: "#fff" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, borderBottom: "2px solid var(--espresso)", paddingBottom: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--camel)", fontWeight: 600 }}>Fiche d&apos;instruction</div>
            <h1 className="serif" style={{ fontSize: 24, fontWeight: 600, color: "var(--ink)", margin: "3px 0 4px" }}>{s.identity.name}</h1>
            <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{[s.identity.sector, ...s.identity.programs].filter(Boolean).join(" · ") || DASH}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-2)", lineHeight: 1.6 }}>
            <div className="serif" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{s.identity.stage}</div>
            <div>{s.identity.state}</div>
            <div>Idawa Capital</div>
            <div>Édité le {new Date(s.editedOn).toLocaleDateString("fr-FR")} par {editedBy}</div>
          </div>
        </header>

        <Section num={1} title="Le dossier">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
            {[["Chargé d'investissement", s.identity.officer], ["Analyste", s.identity.analyst], ["Source", s.identity.source]].map(([k, v]) => (
              <div key={k} style={{ border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px", background: "var(--surface-cream)" }}>
                <div style={{ fontSize: 10, color: "var(--text-2)" }}>{k}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{v ?? DASH}</div>
              </div>
            ))}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {s.facts.map((f) => (
                <tr key={f.label}><td style={{ ...td, color: "var(--text-2)", width: "45%" }}>{f.label}</td><td style={{ ...tdR, fontWeight: 600 }}>{f.value ?? DASH}</td></tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section num={2} title="Prochaine étape">
          {s.nextStep ? (
            <div style={{ fontSize: 12.5, color: "var(--ink)" }}>
              {s.nextStep.title}
              <span style={{ color: "var(--text-2)" }}>
                {s.nextStep.assignee ? ` · ${s.nextStep.assignee}` : ""}
                {s.nextStep.dueDate ? ` · ${s.nextStep.late ? "en retard, " : ""}${fmtDate(s.nextStep.dueDate)}` : " · sans échéance"}
              </span>
            </div>
          ) : <Empty>Aucune action ouverte — ce dossier n&apos;avance pas.</Empty>}
        </Section>

        <Section num={3} title="Thèse d'investissement">
          {s.thesis ? <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{s.thesis}</div> : <Empty>Non renseignée.</Empty>}
        </Section>

        <Section num={4} title="Due diligence" note="Avancement par domaine, et points d'attention encore ouverts.">
          {s.dueDiligence.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Domaine</th><th style={{ ...th, textAlign: "right" }}>Traité</th><th style={{ ...th, textAlign: "right" }}>Points d&apos;attention</th></tr></thead>
              <tbody>
                {s.dueDiligence.map((d) => (
                  <tr key={d.domain}><td style={td}>{d.domain}</td><td style={tdR} className="tnum">{d.done} / {d.total}</td><td style={{ ...tdR, color: d.attention ? "var(--amber-fg)" : "var(--text-2)" }} className="tnum">{d.attention || DASH}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>Aucun point de due diligence saisi.</Empty>}
          {s.ddOpenPoints.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
              <tbody>
                {s.ddOpenPoints.map((p, i) => (
                  <tr key={i}><td style={{ ...td, width: 130, color: "var(--text-2)" }}>{p.kind}</td><td style={td}>{p.label}{p.detail && <span style={{ color: "var(--text-3)" }}> — {p.detail}</span>}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section num={5} title="Passages en comité">
          {s.committees.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {s.committees.map((c, i) => (
                  <tr key={i}><td style={{ ...td, width: 84, color: "var(--text-2)", verticalAlign: "top" }}>{fmtDate(c.date)}</td><td style={{ ...td, width: 190, verticalAlign: "top" }}>{c.kind}</td><td style={{ ...td, verticalAlign: "top" }}>{c.label}{c.detail && <div style={{ color: "var(--text-3)", fontSize: 10.5, marginTop: 2 }}>{c.detail}</div>}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>Aucun passage en comité.</Empty>}
        </Section>

        <Section num={6} title="ESG & impact">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[
              ["Catégorie de risque E&S", s.esg.riskCategory ?? DASH],
              ["Liste d'exclusion", s.esg.exclusionOk == null ? DASH : s.esg.exclusionOk ? "conforme" : "point d'attention"],
              ["Notation d'impact", s.esg.impactScore != null ? `${s.esg.impactScore} / ${s.esg.impactMax}` : DASH],
              ["Actions E&S", s.esg.actionsTotal ? `${s.esg.actionsDone} / ${s.esg.actionsTotal}` : DASH],
            ].map(([k, v]) => (
              <div key={k} style={{ border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px", background: "var(--surface-cream)" }}>
                <div style={{ fontSize: 10, color: "var(--text-2)" }}>{k}</div>
                <div className="serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </Section>

        {s.kpis.length > 0 && (
          <Section num={7} title="Indicateurs suivis">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Indicateur</th><th style={th}>Famille</th><th style={{ ...th, textAlign: "right" }}>Valeur</th><th style={th}>Période</th></tr></thead>
              <tbody>
                {s.kpis.map((k) => (
                  <tr key={k.name}><td style={td}>{k.name}</td><td style={{ ...td, color: "var(--text-2)" }}>{k.category}</td><td style={tdR} className="tnum">{k.value != null ? `${fmtInt(k.value)}${k.unit ? ` ${k.unit}` : ""}` : DASH}</td><td style={{ ...td, color: "var(--text-2)" }}>{k.period ?? DASH}</td></tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <Section num={s.kpis.length > 0 ? 8 : 7} title="Actions ouvertes">
          {s.openTasks.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {s.openTasks.map((t, i) => (
                  <tr key={i}><td style={{ ...td, width: 84, color: (t.date && t.date < s.editedOn) ? "var(--red-fg)" : "var(--text-2)" }}>{fmtDate(t.date)}</td><td style={td}>{t.label}</td><td style={{ ...td, color: "var(--text-2)", width: 120 }}>{t.detail ?? DASH}</td><td style={{ ...td, color: "var(--text-2)", width: 80 }}>{t.kind}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>Aucune action ouverte.</Empty>}
        </Section>

        {s.contacts.length > 0 && (
          <Section num={s.kpis.length > 0 ? 9 : 8} title="Interlocuteurs">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {s.contacts.map((c, i) => (
                  <tr key={i}><td style={td}>{c.name}</td><td style={{ ...td, color: "var(--text-2)" }}>{c.function ?? DASH}</td><td style={{ ...td, color: "var(--text-2)" }}>{c.email ?? DASH}</td><td style={{ ...td, color: "var(--text-2)" }}>{c.phone ?? DASH}</td></tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <footer style={{ borderTop: "1px solid var(--border)", paddingTop: 9, marginTop: 6, fontSize: 10, color: "var(--text-2)", display: "flex", justifyContent: "space-between" }}>
          <span>Idawa Capital · fiche d&apos;instruction · {s.identity.name}</span>
          <span>Montants en FCFA</span>
        </footer>
      </div>
    </div>
  );
}
