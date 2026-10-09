"use client";

import Link from "next/link";
import { useState } from "react";
import type { SessionRow } from "@/lib/data/committees";
import SessionFormModal from "./SessionFormModal";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const frDate = (d: string | null) => d ? `${parseInt(d.slice(8, 10), 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1]} ${d.slice(0, 4)}` : "—";
export const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  "Préparation": { bg: "var(--surface-cream)", fg: "var(--text-2)", label: "En préparation" },
  "Ouverte": { bg: "#E6F0DA", fg: "#3B6D11", label: "Ouverte aux avis" },
  "Close": { bg: "#EEE8E0", fg: "#6B5744", label: "Close" },
};

export default function SessionsClient({ sessions, programCommittees, canEdit }: { sessions: SessionRow[]; programCommittees: string[]; canEdit: boolean }) {
  const [creating, setCreating] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const groups = [
    { title: "En cours", rows: sessions.filter((s) => s.status !== "Close") },
    { title: "Closes", rows: sessions.filter((s) => s.status === "Close") },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-2)", maxWidth: 620, lineHeight: 1.6 }}>
          Préparez une séance, joignez les pièces de chaque dossier et invitez les membres : chacun reçoit un lien personnel pour
          consulter les documents, poser ses questions et donner son avis. Idawa arrête ensuite la décision, validée par la Direction.
        </div>
        {canEdit && <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nouvelle séance</button>}
      </div>

      {sessions.length === 0 && <div className="card" style={{ padding: 28, textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucune séance pour l&apos;instant.</div>}

      {groups.filter((g) => g.rows.length).map((g) => (
        <div key={g.title} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 8px 2px" }}>{g.title}</div>
          <div className="card" style={{ padding: "2px 18px" }}>
            {g.rows.map((s, i) => {
              const st = STATUS_STYLE[s.status];
              const expected = s.items * s.members;
              const late = s.status === "Ouverte" && s.opinionDeadline < today;
              return (
                <Link key={s.id} href={`/comites/${s.id}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderTop: i ? "1px solid var(--sep)" : "none", textDecoration: "none", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{s.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                      {s.committeeType} · séance {frDate(s.sessionDate)} · {s.items} dossier{s.items > 1 ? "s" : ""} · {s.members} membre{s.members > 1 ? "s" : ""}
                    </div>
                  </div>
                  {s.status === "Ouverte" && (
                    <span style={{ fontSize: 12, color: late ? "var(--red-fg, #A6412E)" : "var(--text-2)" }}>
                      Avis {s.opinions} / {expected} · {late ? "date limite dépassée" : `avant le ${frDate(s.opinionDeadline)}`}
                    </span>
                  )}
                  <span className="badge" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {creating && <SessionFormModal programCommittees={programCommittees} onClose={() => setCreating(false)} />}
    </div>
  );
}
