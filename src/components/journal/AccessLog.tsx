"use client";

// Journal des accès : qui entre, qui sort, et qui échoue.
//
// Les échecs méritent d'être en tête : une série sur un même compte est le premier signe
// d'une tentative d'intrusion, et rien ne la signalait jusqu'ici.

import { useState } from "react";
import type { ActivityData } from "@/lib/data/activity";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDateTime(s: string) {
  const d = new Date(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const KIND_BADGE: Record<string, string> = {
  connexion: "badge-green", "échec": "badge-red", "déconnexion": "badge-neutral",
  expiration: "badge-amber", "mot de passe": "badge-amber",
};

/** L'agent du navigateur est illisible : on n'en garde que l'appareil et le navigateur. */
function device(ua: string | null): string {
  if (!ua) return "—";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android"
    : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "—";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "";
  return [os, nav].filter(Boolean).join(" · ") || "—";
}

const th: React.CSSProperties = { textAlign: "left", padding: "8px 12px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-3)", fontWeight: 700, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 12px", fontSize: 12.5, color: "var(--ink)", borderTop: "1px solid var(--sep)", whiteSpace: "nowrap" };

export default function AccessLog({ data }: { data: ActivityData }) {
  const [kind, setKind] = useState("all");
  const [who, setWho] = useState("all");

  const people = Array.from(new Set(data.events.map((e) => e.name ?? e.email ?? "—"))).sort();
  const shown = data.events.filter((e) =>
    (kind === "all" || e.kind === kind) &&
    (who === "all" || (e.name ?? e.email ?? "—") === who)
  );

  // Un même compte visé plusieurs fois sans succès mérite d'être signalé nommément.
  const failuresByAccount = data.events
    .filter((e) => e.kind === "échec")
    .reduce((m, e) => m.set(e.email ?? "—", (m.get(e.email ?? "—") ?? 0) + 1), new Map<string, number>());
  const suspicious = Array.from(failuresByAccount.entries()).filter(([, n]) => n >= 3);

  const sel: React.CSSProperties = { padding: "6px 9px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)" };

  return (
    <div>
      {suspicious.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--red-fg)", background: "var(--red-bg)", borderRadius: 9, padding: "10px 13px", marginBottom: 12, lineHeight: 1.5 }}>
          <b>Tentatives répétées</b> — {suspicious.map(([mail, n]) => `${mail} (${n} échecs)`).join(", ")}.
          Vérifiez qu&apos;il s&apos;agit bien d&apos;un oubli de mot de passe.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={sel}>
          <option value="all">Tous les événements</option>
          {["connexion", "échec", "déconnexion", "expiration", "mot de passe"].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={who} onChange={(e) => setWho(e.target.value)} style={sel}>
          <option value="all">Tout le monde</option>
          {people.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{shown.length} sur {data.events.length}</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Quand</th><th style={th}>Événement</th><th style={th}>Personne</th>
              <th style={th}>Appareil</th><th style={th}>Adresse</th>
            </tr></thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "var(--text-3)" }}>Aucun accès enregistré sur cette période.</td></tr>
              ) : shown.map((e, i) => (
                <tr key={`${e.at}-${i}`}>
                  <td style={{ ...td, color: "var(--text-2)" }}>{frDateTime(e.at)}</td>
                  <td style={td}><span className={`badge ${KIND_BADGE[e.kind] ?? "badge-neutral"}`}>{e.kind}</span></td>
                  <td style={{ ...td, fontWeight: 600 }}>{e.name ?? e.email ?? "compte inconnu"}</td>
                  <td style={{ ...td, color: "var(--text-2)" }}>{device(e.user_agent)}</td>
                  <td style={{ ...td, color: "var(--text-3)", fontSize: 11.5 }}>{e.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 8, lineHeight: 1.6 }}>
        L&apos;email saisi lors d&apos;un échec est conservé, jamais le mot de passe. Un échec sur un compte inexistant
        s&apos;affiche « compte inconnu » : c&apos;est en soi un signal.
        L&apos;appareil est déduit du navigateur ; l&apos;adresse peut être celle d&apos;un réseau partagé.
      </div>
    </div>
  );
}
