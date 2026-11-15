"use client";

// Tableau des dépôts : pour chaque entreprise suivie, la période en cours, son échéance, son statut
// (déposé V0/V1…, ouverte, en retard) et le dernier e-mail parti au référent.

import { useState, useTransition } from "react";
import Link from "next/link";
import { calendarFor, formatDay, type ReportingSetup } from "@/lib/reporting/calendar";
import { sendReportingNow } from "@/app/(app)/reporting/depots-actions";

export type BoardRow = {
  companyId: string; name: string; charge: string | null; suppleant: string | null; referent: string | null; setup: ReportingSetup;
  deposits?: { kind: string; period: string; version: number }[];
  lastMessage?: { kind: string; period: string; sentAt: string } | null;
};

const MSG_LABEL: Record<string, string> = { ouverture: "ouverture", rappel: "rappel", retard: "relance de retard", accuse: "accusé de réception" };

const STYLE: Record<string, { bg: string; fg: string }> = {
  "à venir": { bg: "var(--surface-cream)", fg: "var(--text-2)" },
  "ouverte": { bg: "#F7ECD6", fg: "#8A5A12" },
  "en retard": { bg: "#F6E1DC", fg: "#A6412E" },
};

export default function DepositsBoard({ rows, unconfigured, canSend = false }: { rows: BoardRow[]; unconfigured: { id: string; name: string }[]; canSend?: boolean }) {
  const year = new Date().getFullYear();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof sendReportingNow>> | null>(null);
  const lines = rows.map((r) => {
    const version = (kind: string, period: string) => {
      const v = (r.deposits ?? []).filter((d) => d.kind === kind && d.period === period).map((d) => d.version);
      return v.length ? Math.max(...v) : null;
    };
    const cal = [...calendarFor(r.setup, year - 1), ...calendarFor(r.setup, year), ...calendarFor(r.setup, year + 1)]
      .map((p) => ({ ...p, version: version(p.kind, p.period) }));
    const late = cal.filter((p) => p.state === "en retard" && p.version === null);
    const current = cal.find((p) => p.state === "ouverte") ?? cal.find((p) => p.state === "à venir") ?? null;
    return { ...r, late, current };
  }).sort((a, b) => b.late.length - a.late.length || a.name.localeCompare(b.name, "fr"));

  return (
    <div>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6 }}>
          Qui doit déposer quoi, et pour quand. Le paramétrage se fait sur la fiche de chaque entreprise (Suivi &amp; gouvernance → Reporting entreprise).
          Les e-mails partent seuls chaque matin vers 8 h : ouverture de la période, rappel 2 jours avant l&apos;échéance, relance le lendemain si rien n&apos;est arrivé.
        </div>
        {canSend && (
          <button className="btn" disabled={pending} onClick={() => start(async () => setResult(await sendReportingNow()))}>
            {pending ? "Envoi…" : "Envoyer les e-mails du jour"}
          </button>
        )}
      </div>
      {result && (
        <div className="card" style={{ padding: "10px 14px", marginBottom: 12, fontSize: 12.5, background: result.ok ? "var(--surface-cream)" : "#F6E1DC", color: result.ok ? "var(--text-1)" : "#A6412E" }}>
          {result.message}
          {result.details && result.details.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "var(--text-2)" }}>
              {result.details.map((d, i) => <li key={i}>{d.company} · {d.period} · {MSG_LABEL[d.kind] ?? "information de l'équipe"} → {d.to}{d.ok ? "" : ` — ${d.error ?? "échec"}`}</li>)}
            </ul>
          )}
        </div>
      )}
      <div className="card" style={{ padding: "2px 18px" }}>
        {lines.length === 0 && <div style={{ padding: 22, textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucune entreprise n&apos;a encore de suivi paramétré.</div>}
        {lines.map((l, i) => (
          <div key={l.companyId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: i ? "1px solid var(--sep)" : "none", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <Link href={`/portefeuille/${l.companyId}`} style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>{l.name}</Link>
              <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                Référent : {l.referent ?? "à renseigner"} · Suivi : {l.charge ?? "à désigner"}{l.suppleant ? ` (suppléant : ${l.suppleant})` : ""}
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)", minWidth: 200 }}>
              {l.current ? <>{l.current.label} · échéance {formatDay(l.current.due)}</> : "Aucune période attendue"}
              {l.lastMessage && <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>Dernier e-mail : {MSG_LABEL[l.lastMessage.kind] ?? l.lastMessage.kind} le {formatDay(l.lastMessage.sentAt.slice(0, 10))}</div>}
            </div>
            {l.current && (l.current.version !== null
              ? <span className="badge" style={{ background: "#E3EEDC", color: "#3F6B2E" }}>déposé · V{l.current.version}</span>
              : <span className="badge" style={{ background: STYLE[l.current.state].bg, color: STYLE[l.current.state].fg }}>{l.current.state}</span>)}
            {l.late.length > 0 && <span className="badge" style={{ background: STYLE["en retard"].bg, color: STYLE["en retard"].fg }}>{l.late.length} période{l.late.length > 1 ? "s" : ""} en retard</span>}
          </div>
        ))}
      </div>
      {unconfigured.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 10 }}>
          Sans paramétrage : {unconfigured.map((c, i) => <span key={c.id}>{i ? ", " : ""}<Link href={`/portefeuille/${c.id}`} style={{ color: "var(--camel)" }}>{c.name}</Link></span>)}
        </div>
      )}
    </div>
  );
}
