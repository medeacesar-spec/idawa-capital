import { getAuditLog, TABLE_LABEL, ACTION_LABEL } from "@/lib/data/audit";
import { requirePerm } from "@/lib/auth/permissions";
import AuditExportButton from "@/components/journal/AuditExportButton";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDateTime(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
const ACTION_COLOR: Record<string, string> = { INSERT: "badge-green", UPDATE: "badge-amber", DELETE: "badge-red" };
const th: React.CSSProperties = { textAlign: "left", padding: "9px 14px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-3)", fontWeight: 700, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "9px 14px", fontSize: 12.5, color: "var(--ink)", borderTop: "1px solid var(--sep)", whiteSpace: "nowrap" };

export default async function JournalPage() {
  await requirePerm("users");
  const entries = await getAuditLog(150);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Historique des créations, modifications et suppressions ({entries.length} dernières affichées). L'export contient tout le journal.</div>
        <AuditExportButton />
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Quand</th><th style={th}>Action</th><th style={th}>Objet</th><th style={th}>Élément</th><th style={th}>Par</th>
            </tr></thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "var(--text-3)" }}>Aucune activité enregistrée.</td></tr>
              ) : entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ ...td, color: "var(--text-2)" }}>{frDateTime(e.at)}</td>
                  <td style={td}><span className={`badge ${ACTION_COLOR[e.action] ?? "badge-neutral"}`}>{ACTION_LABEL[e.action] ?? e.action}</span></td>
                  <td style={{ ...td, color: "var(--text-2)" }}>{TABLE_LABEL[e.table] ?? e.table}</td>
                  <td style={{ ...td, fontWeight: 600, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>{e.label || "—"}</td>
                  <td style={{ ...td, color: "var(--text-2)" }}>{e.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
