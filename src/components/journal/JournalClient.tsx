"use client";

// Journal d'audit consultable.
//
// Une liste de 150 lignes sans filtre ne répond à aucune question d'audit : on cherche
// toujours ce qu'une personne précise a fait, ou ce qui est arrivé à un objet précis.
// Et « modification » ne suffit pas — il faut voir la valeur avant et après.

import { useMemo, useState } from "react";
import { TABLE_LABEL, ACTION_LABEL, FIELD_LABEL } from "@/lib/audit-labels";
import type { AuditEntry } from "@/lib/data/audit";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDateTime(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
const ACTION_COLOR: Record<string, string> = { INSERT: "badge-green", UPDATE: "badge-amber", DELETE: "badge-red" };

/** Une valeur brute de base de données n'est pas lisible telle quelle. */
function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "vide";
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (typeof v === "number") return new Intl.NumberFormat("fr-FR").format(v);
  const s = String(v);
  // Un identifiant technique n'apprend rien : on signale le changement sans l'étaler.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s)) return "référence modifiée";
  return s.length > 90 ? `${s.slice(0, 90)}…` : s;
}

const th: React.CSSProperties = { textAlign: "left", padding: "9px 14px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-3)", fontWeight: 700, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "9px 14px", fontSize: 12.5, color: "var(--ink)", borderTop: "1px solid var(--sep)", whiteSpace: "nowrap" };

export default function JournalClient({ entries }: { entries: AuditEntry[] }) {
  const [table, setTable] = useState("all");
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("all");
  const [query, setQuery] = useState("");
  const [openRow, setOpenRow] = useState<string | null>(null);

  const tables = useMemo(() => Array.from(new Set(entries.map((e) => e.table))).sort(), [entries]);
  const actors = useMemo(() => Array.from(new Set(entries.map((e) => e.actor ?? "—"))).sort(), [entries]);

  const shown = entries.filter((e) =>
    (table === "all" || e.table === table) &&
    (action === "all" || e.action === action) &&
    (actor === "all" || (e.actor ?? "—") === actor) &&
    (query.trim() === "" || (e.label ?? "").toLowerCase().includes(query.trim().toLowerCase()))
  );

  const sel: React.CSSProperties = { padding: "6px 9px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <select value={table} onChange={(e) => setTable(e.target.value)} style={sel}>
          <option value="all">Tous les objets</option>
          {tables.map((t) => <option key={t} value={t}>{TABLE_LABEL[t] ?? t}</option>)}
        </select>
        <select value={action} onChange={(e) => setAction(e.target.value)} style={sel}>
          <option value="all">Toutes les actions</option>
          {["INSERT", "UPDATE", "DELETE"].map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
        </select>
        <select value={actor} onChange={(e) => setActor(e.target.value)} style={sel}>
          <option value="all">Tout le monde</option>
          {actors.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un élément…"
          style={{ ...sel, minWidth: 200, flex: 1, maxWidth: 320 }} />
        <span style={{ fontSize: 11.5, color: "var(--text-3)", whiteSpace: "nowrap" }}>
          {shown.length} sur {entries.length}
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Quand</th><th style={th}>Action</th><th style={th}>Objet</th>
              <th style={th}>Élément</th><th style={th}>Par</th><th style={th}>Détail</th>
            </tr></thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: "var(--text-3)" }}>Aucune activité ne correspond à ces filtres.</td></tr>
              ) : shown.map((e) => {
                const n = e.changes ? Object.keys(e.changes).length : 0;
                const open = openRow === e.id;
                return (
                  <>
                    <tr key={e.id}>
                      <td style={{ ...td, color: "var(--text-2)" }}>{frDateTime(e.at)}</td>
                      <td style={td}><span className={`badge ${ACTION_COLOR[e.action] ?? "badge-neutral"}`}>{ACTION_LABEL[e.action] ?? e.action}</span></td>
                      <td style={{ ...td, color: "var(--text-2)" }}>{TABLE_LABEL[e.table] ?? e.table}</td>
                      <td style={{ ...td, fontWeight: 600, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{e.label || "—"}</td>
                      <td style={{ ...td, color: "var(--text-2)" }}>{e.actor}</td>
                      <td style={td}>
                        {n > 0 ? (
                          <button onClick={() => setOpenRow(open ? null : e.id)}
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "var(--camel)" }}>
                            {open ? "− Masquer" : `+ ${n} champ${n > 1 ? "s" : ""}`}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>—</span>
                        )}
                      </td>
                    </tr>
                    {open && e.changes && (
                      <tr key={`${e.id}-d`}>
                        <td colSpan={6} style={{ padding: "4px 14px 12px", borderTop: "none", background: "var(--surface-cream)" }}>
                          <table style={{ borderCollapse: "collapse", width: "100%" }}>
                            <tbody>
                              {Object.entries(e.changes).map(([field, c]) => (
                                <tr key={field}>
                                  <td style={{ padding: "5px 8px", fontSize: 11.5, color: "var(--text-2)", width: 220, verticalAlign: "top" }}>{FIELD_LABEL[field] ?? field}</td>
                                  <td style={{ padding: "5px 8px", fontSize: 11.5, color: "var(--text-3)", textDecoration: "line-through", verticalAlign: "top" }}>{show(c.avant)}</td>
                                  <td style={{ padding: "5px 8px", fontSize: 11.5, color: "var(--text-3)", width: 20, verticalAlign: "top" }}>→</td>
                                  <td style={{ padding: "5px 8px", fontSize: 11.5, fontWeight: 600, color: "var(--ink)", verticalAlign: "top" }}>{show(c.apres)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 8, lineHeight: 1.6 }}>
        Seuls les champs <b>réellement modifiés</b> sont consignés : un ré-enregistrement à l&apos;identique ne laisse pas de trace,
        et les horodatages techniques sont ignorés. Les entrées antérieures au 19 juillet 2026 n&apos;ont pas ce détail,
        le journal ne le conservait pas encore.
      </div>
    </div>
  );
}
