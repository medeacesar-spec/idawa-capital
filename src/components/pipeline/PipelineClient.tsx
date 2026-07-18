"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PipelineData, PipelineDeal } from "@/lib/data/pipeline";
import { fmtM, fmtInt } from "@/lib/format";
import DealFormModal from "./DealFormModal";
import SourceAnalysis from "./SourceAnalysis";

const STAGE_COLOR: Record<string, string> = {
  Sourcing: "#8A7256",
  Analyse: "#A9714B",
  "Due Diligence": "#8A5A3C",
  Négociation: "#B07A2E",
  Closing: "#4A2617",
  Investi: "#2F6140",
  Perdu: "#A6412E",
};

const isConverted = (d: PipelineDeal) => !!d.convertedCompanyId;
const isRejected = (d: PipelineDeal) => d.dealState === "Écarté";
// Clôturé = investi (participation liée) OU écarté.
const isClosed = (d: PipelineDeal) => isConverted(d) || isRejected(d);
const isVeille = (d: PipelineDeal) => !isConverted(d) && d.dealState === "En veille";
type StatusFilter = "actifs" | "veille" | "clotures" | "tous";

function initials(name: string): string {
  const clean = name.replace(/[^A-Za-zÀ-ÿ ]/g, "");
  const caps = clean.replace(/[^A-Z]/g, "");
  if (caps.length >= 2) return caps.slice(0, 2);
  return clean.slice(0, 2).toUpperCase();
}

function Avatar({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{ width: 22, height: 22, borderRadius: "50%", background: bg, color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
      {label}
    </span>
  );
}

export default function PipelineClient({ data, canEdit = true }: { data: PipelineData; canEdit?: boolean }) {
  const router = useRouter();
  const [scope, setScope] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("actifs");
  const [modal, setModal] = useState<{ open: boolean; deal: PipelineDeal | null }>({ open: false, deal: null });
  const byProgram = scope === "all" ? data.deals : data.deals.filter((d) => d.programId === scope);
  const closedCount = byProgram.filter(isClosed).length;
  const veilleCount = byProgram.filter(isVeille).length;
  const list = byProgram.filter((d) =>
    status === "tous" ? true
      : status === "clotures" ? isClosed(d)
      : status === "veille" ? isVeille(d)
      : (!isClosed(d) && !isVeille(d))
  );
  const total = list.reduce((a, d) => a + d.amount, 0);

  async function remove(d: PipelineDeal) {
    if (!confirm(`Supprimer le dossier « ${d.companyName} » ?`)) return;
    const supabase = createClient();
    await supabase.from("deals").delete().eq("id", d.id);
    router.refresh();
  }

  return (
    <div>
      {/* Filtre par programme */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {[{ id: "all", name: "Tous les programmes", color: "var(--espresso)" }, ...data.programs].map((s) => {
          const on = s.id === scope;
          return (
            <button key={s.id} onClick={() => setScope(s.id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                background: on ? s.color : "var(--surface)", color: on ? "#fff" : "var(--text-2)", border: `1px solid ${on ? s.color : "var(--border-strong)"}` }}>
              {s.id !== "all" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? "#fff" : s.color }} />}
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Filtre par statut */}
      <div style={{ display: "inline-flex", gap: 2, marginBottom: 12, background: "var(--surface-cream)", border: "1px solid var(--border)", borderRadius: 999, padding: 3 }}>
        {([
          { id: "actifs", label: "En cours" },
          { id: "veille", label: `En veille${veilleCount ? ` · ${veilleCount}` : ""}` },
          { id: "clotures", label: `Clôturés${closedCount ? ` · ${closedCount}` : ""}` },
          { id: "tous", label: "Tous" },
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

      {/* Stats + action */}
      <div style={{ display: "flex", gap: 18, marginBottom: 10, fontSize: 12.5, color: "var(--text-2)", alignItems: "center", flexWrap: "wrap" }}>
        <span><b className="tnum" style={{ color: "var(--ink)" }}>{fmtInt(list.length)}</b> dossier{list.length > 1 ? "s" : ""}</span>
        <span><b className="serif tnum" style={{ color: "var(--ink)" }}>{fmtM(total)}</b> FCFA {status === "clotures" ? "clôturés" : "en jeu"}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {canEdit && (<button className="btn btn-ghost" onClick={() => router.push("/saisie?scope=pipeline")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Saisir un reporting
          </button>)}
{canEdit && (
                      <button className="btn btn-primary" onClick={() => setModal({ open: true, deal: null })}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Nouveau dossier
          </button>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="card" style={{ padding: "4px 18px" }}>
        {list.length === 0 && (
          <div style={{ padding: "28px 0", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun dossier pour ce périmètre.</div>
        )}
        {list.map((d) => (
          <div key={d.id} className="deal-row deal-row-click" onClick={() => router.push(`/pipeline/${d.id}`)} style={{ cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent-soft)", color: "var(--espresso)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {initials(d.companyName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.companyName}</span>
                {d.programName && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: `${d.programColor}1a`, color: d.programColor ?? "var(--text-2)", flexShrink: 0, whiteSpace: "nowrap" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: d.programColor ?? "var(--text-2)" }} />
                    {d.programName}
                  </span>
                )}
                {d.convertedCompanyId ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "var(--green-bg)", color: "var(--green-fg)", flexShrink: 0, whiteSpace: "nowrap" }}>
                    ✓ Converti
                  </span>
                ) : d.dealState === "En veille" ? (
                  <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "var(--amber-bg)", color: "var(--amber-fg)", flexShrink: 0, whiteSpace: "nowrap" }}>En veille</span>
                ) : d.dealState === "Écarté" ? (
                  <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "var(--neutral-bg)", color: "var(--neutral-fg)", flexShrink: 0, whiteSpace: "nowrap" }}>Écarté</span>
                ) : null}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {d.sector ? `${d.sector} · ` : ""}
                {d.dealState === "Écarté" && !d.convertedCompanyId
                  ? <span style={{ color: "var(--text-2)" }}>{d.rejectionReason ?? "Écarté"}</span>
                  : <><span style={{ color: STAGE_COLOR[d.stage] ?? "var(--text-2)", fontWeight: 600 }}>{d.stage}</span>{d.probability != null ? ` · ${d.probability}%` : ""}</>}
              </div>
            </div>
            <div className="deal-team" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <Avatar label={d.officer ? initials(d.officer) : "—"} bg="var(--espresso)" color="#fff" />
                <span style={{ fontSize: 10.5, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ color: "var(--text-3)" }}>Chargé </span>{d.officer ?? "Non assigné"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <Avatar label={d.analyst ? initials(d.analyst) : "—"} bg="var(--camel)" color="#fff" />
                <span style={{ fontSize: 10.5, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ color: "var(--text-3)" }}>Analyste </span>{d.analyst ?? "Non assigné"}</span>
              </div>
            </div>
            <div className="serif tnum" style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{fmtM(d.amount)}</div>
            {d.convertedCompanyId ? (
              <div className="row-actions">
                <button onClick={(e) => { e.stopPropagation(); router.push(`/portefeuille/${d.convertedCompanyId}`); }} aria-label="Voir la participation" title="Voir la participation"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3h7v7" /><path d="M10 14L21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg></button>
              </div>
            ) : canEdit ? (
              <div className="row-actions">
                <button onClick={(e) => { e.stopPropagation(); setModal({ open: true, deal: d }); }} aria-label="Modifier" title="Modifier"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
                <button onClick={(e) => { e.stopPropagation(); remove(d); }} aria-label="Supprimer" title="Supprimer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
              </div>
            ) : (
              <div />
            )}
          </div>
        ))}
      </div>
      {modal.open && (
        <DealFormModal deal={modal.deal} programs={data.programs} subSectors={data.subSectors} members={data.members} onClose={() => setModal({ open: false, deal: null })} />
      )}
      <SourceAnalysis deals={list} />
    </div>
  );
}
