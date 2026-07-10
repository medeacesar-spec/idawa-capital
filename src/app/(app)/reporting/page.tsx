import { createClient } from "@/lib/supabase/server";

const STATUS_MAP: Record<string, string> = { validé: "badge-green", "en attente": "badge-amber", "en retard": "badge-red" };

export default async function ReportingPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_companies")
    .select("id, name, tracking_type")
    .eq("tracking_type", "equity")
    .order("name");
  const companies = data ?? [];

  // Statuts de reporting représentatifs (période T2 2026)
  const rows = companies.map((c, i) => {
    const cycle = i % 3;
    const status = cycle === 0 ? "validé" : cycle === 1 ? "en attente" : "en retard";
    const completeness = status === "validé" ? 100 : status === "en attente" ? 70 : 35;
    return { name: c.name, status, completeness };
  });
  const received = rows.filter((r) => r.status !== "en retard").length;
  const avgCompleteness = rows.length ? Math.round(rows.reduce((a, r) => a + r.completeness, 0) / rows.length) : 0;

  const tile = (k: string, v: string, sub: string) => (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{k}</div>
      <div className="serif tnum" style={{ fontSize: 23, fontWeight: 600, color: "var(--ink)", marginTop: 5 }}>{v}</div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>{sub}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <span className="badge" style={{ background: "var(--espresso)", color: "#fff" }}>T2 2026</span>
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>Période de reporting</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16v16H4z" /></svg>Excel</button>
          <button className="btn btn-ghost">PDF</button>
          <button className="btn btn-ghost">CSV</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 13, marginBottom: 16, maxWidth: 640 }}>
        {tile("Reçus", `${received}/${rows.length}`, "reportings reçus")}
        {tile("Complétude", `${avgCompleteness}%`, "moyenne du portefeuille")}
        {tile("Périmètre", "Global", "toutes participations")}
      </div>

      <div className="card" style={{ padding: "4px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1.2fr", gap: 10, padding: "10px 0", fontSize: 10, letterSpacing: ".5px", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 600, borderBottom: "1px solid var(--sep)" }}>
          <div>Société</div><div>Statut</div><div>Complétude</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1.2fr", gap: 10, alignItems: "center", padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.name}</div>
            <div><span className={`badge ${STATUS_MAP[r.status]}`}>{r.status}</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: "var(--cream)", borderRadius: 3, maxWidth: 120 }}>
                <div style={{ width: `${r.completeness}%`, height: "100%", background: "var(--camel)", borderRadius: 3 }} />
              </div>
              <span className="tnum" style={{ fontSize: 11.5, color: "var(--text-2)" }}>{r.completeness}%</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10 }}>La génération réelle des exports (Excel/PDF/CSV) et la sélection des champs seront activées prochainement.</div>
    </div>
  );
}
