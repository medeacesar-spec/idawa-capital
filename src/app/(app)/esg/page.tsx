const LV: Record<string, [string, string]> = {
  "Élevé": ["var(--red-bg)", "var(--red-fg)"],
  "Moyen": ["var(--amber-bg)", "var(--amber-fg)"],
  "Faible": ["var(--green-bg)", "var(--green-fg)"],
};

const STEPS = [
  ["1", "Ouverture", "COD"],
  ["2", "Rating d'impact", "Avant invest."],
  ["3", "Due Diligence", "Instruction"],
  ["4", "Bilan DD", "Comité invest."],
  ["5", "Plan d'actions", "Suivi semestriel"],
];

const PS = [
  ["PS1", "Gestion des risques E&S", "Élevé"],
  ["PS2", "Main d'œuvre & conditions de travail", "Moyen"],
  ["PS3", "Ressources & pollution", "Moyen"],
  ["PS4", "Santé-sécurité communautés", "Moyen"],
  ["PS5", "Terres & réinstallation", "Faible"],
  ["PS6", "Biodiversité", "Faible"],
  ["PS7", "Peuples autochtones", "Faible"],
  ["PS8", "Patrimoine culturel", "Faible"],
  ["G", "Gouvernance", "Élevé"],
];

const IMPACT: [string, number, number][] = [
  ["Entrepreneurs", 8, 12],
  ["Clients", 3, 4],
  ["Employés", 9, 12],
  ["Contractants", 2, 4],
];

const ACTIONS: [string, string, string][] = [
  ["Formaliser la politique E&S", "G", "Réalisée"],
  ["Mécanisme de plaintes salariés", "S", "En cours"],
  ["Plan de gestion des déchets", "E", "À lancer"],
  ["Renforcer la parité au comité", "G", "En cours"],
];
const ACT_STATUS: Record<string, string> = { "Réalisée": "badge-green", "En cours": "badge-amber", "À lancer": "badge-red" };

const panel: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "15px 16px" };
const h3: React.CSSProperties = { fontSize: 13, fontWeight: 600, margin: "0 0 11px", color: "var(--ink)" };

export default function EsgPage() {
  const impactTotal = IMPACT.reduce((a, x) => a + x[1], 0);
  const impactMax = IMPACT.reduce((a, x) => a + x[2], 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span className="badge" style={{ background: "var(--surface-cream)", color: "var(--espresso)" }}>Méthodologie I&P / IPDEV 2 · Normes IFC (PS1–PS8)</span>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>Exemple : Le Christal · Secteur EHS Volailles · Risque brut Moyen</span>
      </div>

      {/* Processus 5 étapes */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {STEPS.map((s) => (
          <div key={s[0]} style={{ flex: "1 1 130px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 11, padding: "9px 11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--espresso)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s[0]}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{s[1]}</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3, paddingLeft: 25 }}>{s[2]}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 13 }}>
        {/* Notation risques IFC */}
        <div style={panel}>
          <h3 style={h3}>Notation des risques E&S bruts — normes IFC</h3>
          {PS.map((p, i) => {
            const c = LV[p[2]];
            return (
              <div key={p[0]} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep-2)" }}>
                <span style={{ width: 26, fontSize: 10.5, fontWeight: 700, color: "var(--espresso)" }}>{p[0]}</span>
                <span style={{ flex: 1, fontSize: 11, color: "var(--ink)" }}>{p[1]}</span>
                <span className="badge" style={{ background: c[0], color: c[1] }}>{p[2]}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {/* Rating d'impact */}
          <div style={panel}>
            <h3 style={h3}>Rating d'impact <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(IPDEV 2)</span></h3>
            {IMPACT.map((x) => (
              <div key={x[0]} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: "var(--text-2)" }}>{x[0]}</span>
                  <span className="tnum" style={{ fontWeight: 600, color: "var(--ink)" }}>{x[1]}/{x[2]}</span>
                </div>
                <div style={{ height: 5, background: "var(--cream)", borderRadius: 3 }}>
                  <div style={{ width: `${(x[1] / x[2]) * 100}%`, height: "100%", background: "#3B6D11", borderRadius: 3 }} />
                </div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--sep-2)" }}>
              <span style={{ fontSize: 11, color: "var(--text-2)" }}>Score total</span>
              <span className="serif tnum" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{impactTotal} / {impactMax}</span>
            </div>
          </div>

          {/* Plan d'actions */}
          <div style={panel}>
            <h3 style={h3}>Plan d'actions & monitoring</h3>
            {ACTIONS.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep-2)" }}>
                <span style={{ width: 15, fontSize: 10, fontWeight: 700, color: "var(--text-3)" }}>{a[1]}</span>
                <span style={{ flex: 1, fontSize: 11, color: "var(--ink)" }}>{a[0]}</span>
                <span className={`badge ${ACT_STATUS[a[2]]}`}>{a[2]}</span>
              </div>
            ))}
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 8 }}>Revue semestrielle validée par le Conseil d'administration.</div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 12 }}>
        L'ESG est renseigné par entreprise (screening, due diligence, plan d'actions) dans la fiche de chaque société et de chaque deal.
      </div>
    </div>
  );
}
