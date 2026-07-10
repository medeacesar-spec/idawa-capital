"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PipelineData, PipelineDeal } from "@/lib/data/pipeline";
import { fmtM, fmtInt } from "@/lib/format";
import DealFormModal from "./DealFormModal";

const STAGE_COLOR: Record<string, string> = {
  Sourcing: "#8A7256",
  Analyse: "#A9714B",
  "Due Diligence": "#8A5A3C",
  Négociation: "#B07A2E",
  Closing: "#4A2617",
  Investi: "#2F6140",
  Perdu: "#A6412E",
};

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

export default function PipelineClient({ data }: { data: PipelineData }) {
  const router = useRouter();
  const [scope, setScope] = useState<string>("all");
  const [modal, setModal] = useState<{ open: boolean; deal: PipelineDeal | null }>({ open: false, deal: null });
  const list = scope === "all" ? data.deals : data.deals.filter((d) => d.programId === scope);
  const total = list.reduce((a, d) => a + d.amount, 0);

  async function remove(d: PipelineDeal) {
    if (!confirm(`Supprimer le deal « ${d.companyName} » ?`)) return;
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

      {/* Stats + action */}
      <div style={{ display: "flex", gap: 18, marginBottom: 10, fontSize: 12.5, color: "var(--text-2)", alignItems: "center", flexWrap: "wrap" }}>
        <span><b className="tnum" style={{ color: "var(--ink)" }}>{fmtInt(list.length)}</b> deal{list.length > 1 ? "s" : ""}</span>
        <span><b className="serif tnum" style={{ color: "var(--ink)" }}>{fmtM(total)}</b> FCFA en jeu</span>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setModal({ open: true, deal: null })}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Nouveau deal
        </button>
      </div>

      {/* Liste */}
      <div className="card" style={{ padding: "4px 18px" }}>
        {list.length === 0 && (
          <div style={{ padding: "28px 0", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun deal pour ce périmètre.</div>
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
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {d.sector ? `${d.sector} · ` : ""}
                <span style={{ color: STAGE_COLOR[d.stage] ?? "var(--text-2)", fontWeight: 600 }}>{d.stage}</span>
                {d.probability != null ? ` · ${d.probability}%` : ""}
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
            <div className="row-actions">
              <button onClick={(e) => { e.stopPropagation(); setModal({ open: true, deal: d }); }} aria-label="Modifier" title="Modifier"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
              <button onClick={(e) => { e.stopPropagation(); remove(d); }} aria-label="Supprimer" title="Supprimer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
            </div>
          </div>
        ))}
      </div>
      {modal.open && (
        <DealFormModal deal={modal.deal} programs={data.programs} subSectors={data.subSectors} members={data.members} onClose={() => setModal({ open: false, deal: null })} />
      )}
    </div>
  );
}
