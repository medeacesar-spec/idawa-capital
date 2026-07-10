"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DealDetail, CommitteePassage } from "@/lib/data/dealDetail";
import { fmtM } from "@/lib/format";
import CommitteeFormModal from "./CommitteeFormModal";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frMonth(d: string | null) { if (!d) return "—"; return `${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`; }
function initials(name: string) { const caps = name.replace(/[^A-Z]/g, ""); return caps.length >= 2 ? caps.slice(0, 2) : name.slice(0, 2).toUpperCase(); }

const STAGE_BADGE: Record<string, { bg: string; fg: string }> = {
  Sourcing: { bg: "var(--neutral-bg)", fg: "var(--neutral-fg)" }, Analyse: { bg: "#F0E4D0", fg: "#8A5A3C" },
  "Due Diligence": { bg: "#F0E4D0", fg: "#8A5A3C" }, Négociation: { bg: "var(--amber-bg)", fg: "var(--amber-fg)" },
  Closing: { bg: "var(--green-bg)", fg: "var(--green-fg)" }, Investi: { bg: "var(--green-bg)", fg: "var(--green-fg)" }, Perdu: { bg: "var(--red-bg)", fg: "var(--red-fg)" },
};
const DECISION_COLOR: Record<string, string> = { Favorable: "#2F6140", "Favorable sous conditions": "#8A5A18", Ajourné: "#6B5744", Défavorable: "#A6412E" };
const DECISION_BADGE: Record<string, string> = { Favorable: "badge-green", "Favorable sous conditions": "badge-amber", Ajourné: "badge-neutral", Défavorable: "badge-red" };

const TABS = ["Présentation", "Suivi", "Due diligence", "Comités", "KPIs", "Création de valeur", "ESG", "Documents", "Contacts"];

function EmptyTab({ title, desc }: { title: string; desc: string }) {
  return <div className="card" style={{ padding: "32px 28px" }}><div className="serif" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{title}</div><div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6 }}>{desc}</div></div>;
}

export default function DealDetailClient({ deal }: { deal: DealDetail }) {
  const router = useRouter();
  const [tab, setTab] = useState(deal.committees.length ? "Comités" : "Présentation");
  const [comModal, setComModal] = useState<{ open: boolean; passage: CommitteePassage | null }>({ open: false, passage: null });
  const stageBadge = STAGE_BADGE[deal.stage] ?? STAGE_BADGE["Sourcing"];

  async function removeCommittee(id: string) {
    if (!confirm("Supprimer ce passage en comité ?")) return;
    const supabase = createClient();
    await supabase.from("committee_passages").delete().eq("id", id);
    router.refresh();
  }

  const facts: [string, string][] = [
    ["Montant", fmtM(deal.amount)],
    ["Probabilité", deal.probability != null ? `${deal.probability} %` : "—"],
    ["Valo pré-money", deal.valuationPre != null ? fmtM(deal.valuationPre) : "—"],
    ["Closing prévu", frMonth(deal.expectedClose)],
    ["Chargé", deal.officer ?? "—"],
    ["Analyste", deal.analyst ?? "—"],
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <button onClick={() => router.push("/pipeline")} aria-label="Retour" style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--accent-soft)", color: "var(--espresso)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{initials(deal.companyName)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)" }}>{deal.companyName}</span>
            <span className="badge" style={{ background: stageBadge.bg, color: stageBadge.fg }}>{deal.stage}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
            {deal.sector && <span style={{ fontSize: 12, color: "var(--text-2)" }}>{deal.sector}</span>}
            {deal.programName && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-3)" }}>· <span style={{ width: 7, height: 7, borderRadius: "50%", background: deal.programColor ?? "var(--text-3)" }} />{deal.programName}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 18 }}>
        {facts.map(([k, v]) => (
          <div key={k} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-2)" }}>{k}</div>
            <div className="serif tnum" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {TABS.map((t) => {
          const on = t === tab;
          return <button key={t} onClick={() => setTab(t)} style={{ padding: "9px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12.5, fontWeight: on ? 600 : 500, color: on ? "var(--espresso)" : "var(--text-2)", borderBottom: `2px solid ${on ? "var(--espresso)" : "transparent"}`, marginBottom: -1 }}>{t}</button>;
        })}
      </div>

      {tab === "Présentation" && (
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Thèse d'investissement</div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.65 }}>{deal.thesis || "Non renseignée. Utilisez « Modifier » pour ajouter la thèse d'investissement."}</div>
        </div>
      )}

      {tab === "Comités" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Passages en comité <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— un dossier peut repasser plusieurs fois</span></div>
            <button className="btn btn-primary" onClick={() => setComModal({ open: true, passage: null })}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Enregistrer un passage
            </button>
          </div>
          {deal.committees.length === 0 ? (
            <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun passage en comité. Cliquez « Enregistrer un passage » pour ajouter un comité et son compte-rendu.</div>
          ) : (
            <div className="card" style={{ padding: "18px 20px" }}>
              {deal.committees.map((c, i) => {
                const last = i === deal.committees.length - 1;
                const col = DECISION_COLOR[c.decision ?? ""] ?? "var(--text-3)";
                return (
                  <div key={c.id} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 13, height: 13, borderRadius: "50%", background: last ? col : "var(--surface)", border: `2px solid ${col}`, flexShrink: 0 }} />
                      {!last && <div style={{ flex: 1, width: 2, background: "var(--border)", margin: "2px 0" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.committeeType}</span>
                        {c.decision && <span className={`badge ${DECISION_BADGE[c.decision] ?? "badge-neutral"}`}>{c.decision}</span>}
                        <span className="row-actions" style={{ marginLeft: "auto" }}>
                          <button onClick={() => setComModal({ open: true, passage: c })} aria-label="Modifier"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
                          <button onClick={() => removeCommittee(c.id)} aria-label="Supprimer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", margin: "2px 0 4px" }}>{c.sessionDate ? frMonth(c.sessionDate) : ""}{c.participants ? ` · ${c.participants}` : ""}</div>
                      {c.conditions && <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.5 }}>{c.conditions}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "Suivi" && <EmptyTab title="Suivi (notes & actions)" desc="Journal des réunions, appels, et actions de suivi (avec responsable et échéance). À alimenter au fil de la relation." />}
      {tab === "Due diligence" && <EmptyTab title="Due diligence" desc="Avancement de la due diligence par domaine (financière, juridique, commerciale, opérationnelle, ESG)." />}
      {tab === "KPIs" && <EmptyTab title="KPIs (suivi)" desc="Indicateurs clés suivis dès la phase de due diligence. Activez le suivi et saisissez les valeurs via « Saisir un reporting »." />}
      {tab === "Création de valeur" && <EmptyTab title="Plan de création de valeur" desc="Plan préliminaire préparé pendant l'instruction, repris par la société à la conversion." />}
      {tab === "ESG" && <EmptyTab title="ESG & Impact" desc="Screening E&S (catégorie de risque, liste d'exclusion, risques PS1-8) et rating d'impact IPDEV 2." />}

      {tab === "Documents" && (
        deal.documents.length === 0 ? <EmptyTab title="Documents" desc="Aucun document rattaché à ce dossier." /> : (
          <div className="card" style={{ padding: "4px 18px" }}>
            {deal.documents.map((d, i) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--camel)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h9l5 5v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /></svg>
                <span style={{ flex: 1, fontSize: 13, color: "var(--ink)" }}>{d.title}</span>
                {d.category && <span className="badge badge-neutral">{d.category}</span>}
              </div>
            ))}
          </div>
        )
      )}

      {tab === "Contacts" && (
        deal.contacts.length === 0 ? <EmptyTab title="Contacts" desc="Aucun contact rattaché à ce dossier." /> : (
          <div className="card" style={{ padding: "4px 18px" }}>
            {deal.contacts.map((ct, i) => (
              <div key={ct.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--espresso)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{initials(ct.name)}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{ct.name}</div><div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{ct.function ?? "—"}</div></div>
                {ct.email && <a href={`mailto:${ct.email}`} style={{ fontSize: 11.5, color: "var(--camel)" }}>{ct.email}</a>}
              </div>
            ))}
          </div>
        )
      )}

      {comModal.open && <CommitteeFormModal dealId={deal.id} passage={comModal.passage} onClose={() => setComModal({ open: false, passage: null })} />}
    </div>
  );
}
