"use client";

// Activité de l'équipe, en tête du journal.
//
// Deux questions distinctes : qui est là MAINTENANT, et qui vient RÉGULIÈREMENT.
// La première sert au quotidien, la seconde à l'animation de l'équipe.

import type { ActivityData } from "@/lib/data/activity";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function ago(iso: string | null): string {
  if (!iso) return "jamais";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = new Date(iso);
  const days = Math.round(mins / 1440);
  if (days < 30) return `il y a ${days} j`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const th: React.CSSProperties = { textAlign: "left", padding: "8px 12px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-3)", fontWeight: 700, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 12px", fontSize: 12.5, color: "var(--ink)", borderTop: "1px solid var(--sep)", whiteSpace: "nowrap" };

export default function ActivityPanel({ data }: { data: ActivityData }) {
  const online = data.sessions.length;
  const venus = data.users.filter((u) => u.logins > 0).length;
  const jamais = data.users.filter((u) => u.logins === 0);

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>
        Activité de l&apos;équipe <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— sur {data.windowDays} jours</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 14 }}>
        {([
          ["Connectés maintenant", String(online), online > 0 ? data.sessions.map((s) => s.name ?? s.email).join(", ") : "personne"],
          ["Sont venus", `${venus} / ${data.users.length}`, "au moins une fois"],
          ["Connexions", String(data.users.reduce((a, u) => a + u.logins, 0)), "toutes personnes"],
          ["Modifications", String(data.users.reduce((a, u) => a + u.actions, 0)), "enregistrées au journal"],
        ] as [string, string, string][]).map(([k, v, sub]) => (
          <div key={k} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-2)" }}>{k}</div>
            <div className="serif tnum" style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Personne</th><th style={th}>Rôle</th>
              <th style={{ ...th, textAlign: "right" }}>Connexions</th>
              <th style={th}>Dernière venue</th>
              <th style={{ ...th, textAlign: "right" }}>Modifications</th>
              <th style={th}>Dernière action</th>
            </tr></thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td style={td}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <span title={u.online ? "Connecté" : "Hors ligne"}
                        style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: u.online ? "var(--green-fg)" : "var(--border-strong)" }} />
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </span>
                  </td>
                  <td style={{ ...td, color: "var(--text-2)" }}>{u.role ?? "—"}</td>
                  <td className="tnum" style={{ ...td, textAlign: "right", color: u.logins === 0 ? "var(--text-3)" : "var(--ink)" }}>{u.logins || "—"}</td>
                  <td style={{ ...td, color: "var(--text-2)" }}>{ago(u.lastLogin)}</td>
                  <td className="tnum" style={{ ...td, textAlign: "right", color: u.actions === 0 ? "var(--text-3)" : "var(--ink)" }}>{u.actions || "—"}</td>
                  <td style={{ ...td, color: "var(--text-2)" }}>{ago(u.lastAction)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {jamais.length > 0 && (
        <div style={{ fontSize: 11.5, color: "var(--amber-fg)", background: "var(--amber-bg)", borderRadius: 9, padding: "9px 12px", marginTop: 10, lineHeight: 1.5 }}>
          <b>{jamais.length} personne{jamais.length > 1 ? "s" : ""}</b> {jamais.length > 1 ? "ne se sont pas connectées" : "ne s'est pas connecté"} depuis {data.windowDays} jours :
          {" "}{jamais.map((u) => u.name).join(", ")}. Un compte inutilisé est un accès ouvert pour rien.
        </div>
      )}

      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 8, lineHeight: 1.6 }}>
        « Connecté maintenant » signifie une session active vue dans les vingt dernières minutes — au-delà, on considère que la
        personne a quitté l&apos;outil sans se déconnecter. L&apos;historique des connexions démarre au 19 juillet 2026 :
        avant, seule la dernière venue de chaque compte était conservée, et elle a été reprise telle quelle.
      </div>
    </div>
  );
}
