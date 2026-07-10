"use client";

import { useState } from "react";
import type { PortfolioData, PortfolioCompany } from "@/lib/data/portfolio";
import { fmtM, fmtMult, fmtPct, fmtInt } from "@/lib/format";

const STATUS_BADGE: Record<string, { bg: string; fg: string }> = {
  Actif: { bg: "var(--green-bg)", fg: "var(--green-fg)" },
  "En difficulté": { bg: "var(--amber-bg)", fg: "var(--amber-fg)" },
  Sorti: { bg: "var(--neutral-bg)", fg: "var(--neutral-fg)" },
};

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frMonth(d: string | null): string {
  if (!d) return "—";
  const y = d.slice(0, 4);
  const m = parseInt(d.slice(5, 7), 10);
  return `${MONTHS[m - 1] ?? ""} ${y}`;
}

function initials(name: string): string {
  const caps = name.replace(/[^A-Z]/g, "");
  if (caps.length >= 2) return caps.slice(0, 2);
  return name.slice(0, 2).toUpperCase();
}

function EquityCard({ c }: { c: PortfolioCompany }) {
  const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE["Actif"];
  const multColor = (c.tvpi ?? 0) >= 1 ? "var(--green-fg)" : "var(--red-fg)";
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
        <div style={{ width: 35, height: 35, borderRadius: 9, background: "var(--brown)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(c.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.sector ?? "—"}</div>
        </div>
        <span className="badge" style={{ background: badge.bg, color: badge.fg }}>{c.status}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
        <div><div style={{ fontSize: 10, color: "var(--text-3)" }}>Investi</div><div className="serif tnum" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{fmtM(c.invested)}</div></div>
        <div><div style={{ fontSize: 10, color: "var(--text-3)" }}>Valeur</div><div className="serif tnum" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{fmtM(c.valuation)}</div></div>
        <div><div style={{ fontSize: 10, color: "var(--text-3)" }}>Multiple</div><div className="serif tnum" style={{ fontSize: 12.5, fontWeight: 600, color: multColor }}>{fmtMult(c.tvpi)}</div></div>
      </div>
      <div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-2)" }}>
        <span>Participation : {c.ownership != null ? `${c.ownership}%` : "—"}</span>
        <span>TRI : <b style={{ color: (c.tri ?? 0) >= 0 ? "var(--green-fg)" : "var(--red-fg)" }}>{fmtPct(c.tri)}</b></span>
      </div>
      <ProgramTag c={c} />
    </div>
  );
}

function AccompCard({ c }: { c: PortfolioCompany }) {
  const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE["Actif"];
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
        <div style={{ width: 35, height: 35, borderRadius: 9, background: "var(--accent-soft)", color: "var(--espresso)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(c.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.sector ?? "—"}</div>
        </div>
        <span className="badge" style={{ background: badge.bg, color: badge.fg }}>{c.status}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-cream)", borderRadius: 9, padding: "9px 11px" }}>
        <span className="badge badge-amber">Accompagnement</span>
        <span style={{ fontSize: 11, color: "var(--text-2)" }}>Suivie depuis {frMonth(c.investedDate)}</span>
      </div>
      <ProgramTag c={c} />
    </div>
  );
}

function ProgramTag({ c }: { c: PortfolioCompany }) {
  if (!c.programName) return null;
  const closed = c.programStatus === "Clos";
  return (
    <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid var(--sep)", display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.programColor ?? "var(--text-3)" }} />
      <span style={{ fontSize: 10.5, color: "var(--text-3)" }}>{c.programName}</span>
      {closed && <span className="badge badge-neutral" style={{ fontSize: 9.5, padding: "1px 7px" }}>Clos</span>}
    </div>
  );
}

export default function PortfolioClient({ data }: { data: PortfolioData }) {
  const [scope, setScope] = useState<string>("all");
  const active = data.programs.filter((p) => p.status !== "Clos");
  const closed = data.programs.filter((p) => p.status === "Clos");

  const list =
    scope === "all"
      ? data.companies.filter((c) => c.programStatus !== "Clos")
      : data.companies.filter((c) => c.programId === scope);

  const equity = list.filter((c) => c.trackingType === "equity");
  const accomp = list.filter((c) => c.trackingType === "accompagnement");
  const invested = equity.reduce((a, c) => a + c.invested, 0);
  const valuation = equity.reduce((a, c) => a + c.valuation, 0);
  const tvpi = invested > 0 ? valuation / invested : null;

  function Pill({ id, name, color, isClosed }: { id: string; name: string; color: string; isClosed?: boolean }) {
    const on = id === scope;
    return (
      <button onClick={() => setScope(id)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          background: on ? color : "var(--surface)", color: on ? "#fff" : isClosed ? "var(--text-3)" : "var(--text-2)",
          border: `1px ${isClosed && !on ? "dashed" : "solid"} ${on ? color : "var(--border-strong)"}`, opacity: isClosed && !on ? 0.85 : 1 }}>
        {id !== "all" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? "#fff" : color }} />}
        {name}
        {isClosed && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        )}
      </button>
    );
  }

  return (
    <div>
      {/* Filtre par programme (Equity + programmes, + programmes clos) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
        <Pill id="all" name="Tous" color="var(--espresso)" />
        {active.map((p) => <Pill key={p.id} id={p.id} name={p.name} color={p.color} />)}
        {closed.length > 0 && <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 2px" }} />}
        {closed.map((p) => <Pill key={p.id} id={p.id} name={p.name} color={p.color} isClosed />)}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12 }}>
        {closed.length > 0 && "Les programmes clos (verrouillés) conservent l'historique des entreprises accompagnées."}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 18, marginBottom: 14, fontSize: 12.5, color: "var(--text-2)", flexWrap: "wrap" }}>
        <span><b className="tnum" style={{ color: "var(--ink)" }}>{fmtInt(equity.length)}</b> participation{equity.length > 1 ? "s" : ""}</span>
        {accomp.length > 0 && <span><b className="tnum" style={{ color: "var(--ink)" }}>{fmtInt(accomp.length)}</b> accompagnée{accomp.length > 1 ? "s" : ""}</span>}
        {invested > 0 && <span>Investi <b className="serif tnum" style={{ color: "var(--ink)" }}>{fmtM(invested)}</b></span>}
        {valuation > 0 && <span>Valeur <b className="serif tnum" style={{ color: "var(--ink)" }}>{fmtM(valuation)}</b></span>}
        {tvpi != null && <span>TVPI <b className="serif tnum" style={{ color: "var(--green-fg)" }}>{fmtMult(tvpi)}</b></span>}
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ padding: "28px 0", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucune entreprise pour ce périmètre.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
          {list.map((c) => (c.trackingType === "equity" ? <EquityCard key={c.id} c={c} /> : <AccompCard key={c.id} c={c} />))}
        </div>
      )}
    </div>
  );
}
