type Role = { name: string; permissions: Record<string, string> | null };

const DOMAINS: { key: string; label: string }[] = [
  { key: "pipeline", label: "Pipeline" },
  { key: "portefeuille", label: "Portefeuille" },
  { key: "comites", label: "Comités" },
  { key: "reporting", label: "Reporting" },
  { key: "consolide", label: "Performance · ESG global" },
  { key: "partenaires", label: "Partenaires & LPs" },
  { key: "config", label: "Paramètres · Biblio. KPIs" },
  { key: "users", label: "Utilisateurs & rôles" },
];

const LEVEL: Record<string, { t: string; bg: string; fg: string }> = {
  E: { t: "Édition", bg: "var(--green-bg)", fg: "var(--green-fg)" },
  V: { t: "Validation", bg: "var(--amber-bg)", fg: "var(--amber-fg)" },
  L: { t: "Lecture", bg: "var(--neutral-bg)", fg: "var(--neutral-fg)" },
  "-": { t: "—", bg: "transparent", fg: "var(--text-3)" },
};

export default function AccessMatrix({ roles }: { roles: Role[] }) {
  const th: React.CSSProperties = { padding: "9px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-2)", textAlign: "center", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" };
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <h2 className="serif" style={{ fontSize: 17, color: "var(--espresso)", margin: 0 }}>Matrice des accès par rôle</h2>
        <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>Qui peut faire quoi, par domaine de l'application.</span>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left", position: "sticky", left: 0, zIndex: 1 }}>Rôle</th>
                {DOMAINS.map((d) => <th key={d.key} style={th}>{d.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {roles.map((r, i) => (
                <tr key={r.name}>
                  <td style={{ padding: "10px 12px", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", borderTop: i === 0 ? "none" : "1px solid var(--sep)", position: "sticky", left: 0, background: "var(--surface)" }}>{r.name}</td>
                  {DOMAINS.map((d) => {
                    const lv = LEVEL[r.permissions?.[d.key] ?? "-"] ?? LEVEL["-"];
                    return (
                      <td key={d.key} style={{ padding: "10px 12px", textAlign: "center", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
                        <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 600, background: lv.bg, color: lv.fg }}>{lv.t}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 11, color: "var(--text-3)" }}>
        <span><b style={{ color: "var(--green-fg)" }}>Édition</b> : créer / modifier</span>
        <span><b style={{ color: "var(--amber-fg)" }}>Validation</b> : valider (comités)</span>
        <span><b style={{ color: "var(--text-2)" }}>Lecture</b> : consulter</span>
        <span><b>—</b> : aucun accès (masqué du menu)</span>
      </div>
    </div>
  );
}
