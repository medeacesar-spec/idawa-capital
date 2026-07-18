"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PortfolioData, PortfolioCompany } from "@/lib/data/portfolio";
import { fmtM, fmtMult, fmtPct, fmtInt } from "@/lib/format";
import CompanyFormModal from "./CompanyFormModal";

const STATUS_BADGE: Record<string, { bg: string; fg: string }> = {
  Actif: { bg: "var(--green-bg)", fg: "var(--green-fg)" },
  "En difficulté": { bg: "var(--amber-bg)", fg: "var(--amber-fg)" },
  Sorti: { bg: "var(--neutral-bg)", fg: "var(--neutral-fg)" },
  Radié: { bg: "var(--red-bg)", fg: "var(--red-fg)" },
};

const CLOSED_STATUS = ["Sorti", "Radié"];
const isClosedCompany = (c: PortfolioCompany) => CLOSED_STATUS.includes(c.status);
type StatusFilter = "actives" | "closes" | "toutes";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frMonth(d: string | null): string {
  if (!d) return "—";
  return `${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`;
}
function initials(name: string): string {
  const caps = name.replace(/[^A-Z]/g, "");
  return caps.length >= 2 ? caps.slice(0, 2) : name.slice(0, 2).toUpperCase();
}

function Actions({ onEdit, onDelete, canEdit }: { onEdit: () => void; onDelete: () => void; canEdit: boolean }) {
  if (!canEdit) return null;
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  return (
    <div style={{ display: "flex", gap: 2 }}>
      <button onClick={stop(onEdit)} aria-label="Modifier" title="Modifier" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, display: "flex" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
      </button>
      <button onClick={stop(onDelete)} aria-label="Supprimer" title="Supprimer" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, display: "flex" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
      </button>
    </div>
  );
}

function ProgramTag({ c }: { c: PortfolioCompany }) {
  if (!c.programName) return null;
  return (
    <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid var(--sep)", display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.programColor ?? "var(--text-3)" }} />
      <span style={{ fontSize: 10.5, color: "var(--text-3)" }}>{c.programName}</span>
      {c.programStatus === "Clos" && <span className="badge badge-neutral" style={{ fontSize: 9.5, padding: "1px 7px" }}>Clos</span>}
    </div>
  );
}

function EquityCard({ c, onEdit, onDelete, onOpen, canEdit }: { c: PortfolioCompany; onEdit: () => void; onDelete: () => void; onOpen: () => void; canEdit: boolean }) {
  const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE["Actif"];
  const multColor = (c.tvpi ?? 0) >= 1 ? "var(--green-fg)" : "var(--red-fg)";
  return (
    <div className="card card-clickable" onClick={onOpen} style={{ padding: 14, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
        <div style={{ width: 35, height: 35, borderRadius: 9, background: "var(--brown)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(c.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.sector ?? "—"}</div>
        </div>
        <span className="badge" style={{ background: badge.bg, color: badge.fg }}>{c.status}</span>
        <Actions onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
        <div><div style={{ fontSize: 10, color: "var(--text-3)" }}>Investi</div><div className="serif tnum" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{fmtM(c.invested)}</div></div>
        <div><div style={{ fontSize: 10, color: "var(--text-3)" }}>Valorisation</div><div className="serif tnum" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{fmtM(c.valuation)}</div></div>
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

function AccompCard({ c, onEdit, onDelete, onOpen, canEdit }: { c: PortfolioCompany; onEdit: () => void; onDelete: () => void; onOpen: () => void; canEdit: boolean }) {
  const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE["Actif"];
  return (
    <div className="card card-clickable" onClick={onOpen} style={{ padding: 14, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
        <div style={{ width: 35, height: 35, borderRadius: 9, background: "var(--accent-soft)", color: "var(--espresso)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(c.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.sector ?? "—"}</div>
        </div>
        <span className="badge" style={{ background: badge.bg, color: badge.fg }}>{c.status}</span>
        <Actions onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-cream)", borderRadius: 9, padding: "9px 11px" }}>
        <span className="badge badge-amber">Accélération</span>
        <span style={{ fontSize: 11, color: "var(--text-2)" }}>Suivie depuis {frMonth(c.investedDate)}</span>
      </div>
      <ProgramTag c={c} />
    </div>
  );
}

export default function PortfolioClient({ data, canEdit = true }: { data: PortfolioData; canEdit?: boolean }) {
  const router = useRouter();
  const [scope, setScope] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("actives");
  const [modal, setModal] = useState<{ open: boolean; company: PortfolioCompany | null }>({ open: false, company: null });

  const active = data.programs.filter((p) => p.status !== "Clos");
  const closed = data.programs.filter((p) => p.status === "Clos");
  const byProgram = scope === "all" ? data.companies.filter((c) => c.programStatus !== "Clos") : data.companies.filter((c) => (c.programIds?.length ? c.programIds.includes(scope) : c.programId === scope));
  const closedCount = byProgram.filter(isClosedCompany).length;
  const list = byProgram.filter((c) =>
    status === "toutes" ? true : status === "closes" ? isClosedCompany(c) : !isClosedCompany(c)
  );
  const equity = list.filter((c) => c.trackingType === "equity");
  const accomp = list.filter((c) => c.trackingType === "accompagnement");
  const invested = equity.reduce((a, c) => a + c.invested, 0);
  const valuation = equity.reduce((a, c) => a + c.valuation, 0);
  const tvpi = invested > 0 ? valuation / invested : null;

  async function remove(c: PortfolioCompany) {
    if (!confirm(`Supprimer « ${c.name} » du portefeuille ?`)) return;
    const supabase = createClient();
    await supabase.from("portfolio_companies").delete().eq("id", c.id);
    router.refresh();
  }

  function Pill({ id, name, color, isClosed }: { id: string; name: string; color: string; isClosed?: boolean }) {
    const on = id === scope;
    return (
      <button onClick={() => setScope(id)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          background: on ? color : "var(--surface)", color: on ? "#fff" : isClosed ? "var(--text-3)" : "var(--text-2)",
          border: `1px ${isClosed && !on ? "dashed" : "solid"} ${on ? color : "var(--border-strong)"}` }}>
        {id !== "all" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? "#fff" : color }} />}
        {name}
      </button>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Pill id="all" name="Tous" color="var(--espresso)" />
          {active.map((p) => <Pill key={p.id} id={p.id} name={p.name} color={p.color} />)}
          {closed.length > 0 && <span style={{ width: 1, height: 20, background: "var(--border)" }} />}
          {closed.map((p) => <Pill key={p.id} id={p.id} name={p.name} color={p.color} isClosed />)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canEdit && (<button className="btn btn-ghost" onClick={() => router.push("/saisie?scope=portefeuille")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Saisir un reporting
          </button>)}
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setModal({ open: true, company: null })}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Nouvelle entreprise
            </button>
          )}
        </div>
      </div>

      {/* Filtre par statut */}
      <div style={{ display: "inline-flex", gap: 2, marginBottom: 12, background: "var(--surface-cream)", border: "1px solid var(--border)", borderRadius: 999, padding: 3 }}>
        {([
          { id: "actives", label: "En portefeuille" },
          { id: "closes", label: `Sorties & radiées${closedCount ? ` · ${closedCount}` : ""}` },
          { id: "toutes", label: "Toutes" },
        ] as { id: StatusFilter; label: string }[]).map((t) => {
          const on = t.id === status;
          return (
            <button key={t.id} onClick={() => setStatus(t.id)}
              style={{ padding: "6px 14px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none",
                background: on ? "var(--espresso)" : "transparent", color: on ? "#fff" : "var(--text-2)" }}>
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 18, marginBottom: 14, fontSize: 12.5, color: "var(--text-2)", flexWrap: "wrap" }}>
        <span><b className="tnum" style={{ color: "var(--ink)" }}>{fmtInt(equity.length)}</b> participation{equity.length > 1 ? "s" : ""}</span>
        {accomp.length > 0 && <span><b className="tnum" style={{ color: "var(--ink)" }}>{fmtInt(accomp.length)}</b> accélérée{accomp.length > 1 ? "s" : ""}</span>}
        {invested > 0 && <span>Investi <b className="serif tnum" style={{ color: "var(--ink)" }}>{fmtM(invested)}</b></span>}
        {valuation > 0 && <span>Valorisation <b className="serif tnum" style={{ color: "var(--ink)" }}>{fmtM(valuation)}</b></span>}
        {tvpi != null && <span>TVPI <b className="serif tnum" style={{ color: "var(--green-fg)" }}>{fmtMult(tvpi)}</b></span>}
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ padding: "28px 0", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>
          {status === "actives" && closedCount > 0
            ? <>Aucune entreprise active pour ce périmètre. <button onClick={() => setStatus("closes")} style={{ background: "none", border: "none", color: "var(--camel)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13, textDecoration: "underline" }}>{closedCount} en historique (sorties & radiées)</button></>
            : "Aucune entreprise pour ce périmètre."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {list.map((c) =>
            c.trackingType === "equity"
              ? <EquityCard key={c.id} c={c} onEdit={() => setModal({ open: true, company: c })} onDelete={() => remove(c)} onOpen={() => router.push(`/portefeuille/${c.id}`)} canEdit={canEdit} />
              : <AccompCard key={c.id} c={c} onEdit={() => setModal({ open: true, company: c })} onDelete={() => remove(c)} onOpen={() => router.push(`/portefeuille/${c.id}`)} canEdit={canEdit} />
          )}
        </div>
      )}

      {modal.open && (
        <CompanyFormModal company={modal.company} programs={data.programs} subSectors={data.subSectors} onClose={() => setModal({ open: false, company: null })} />
      )}
    </div>
  );
}
