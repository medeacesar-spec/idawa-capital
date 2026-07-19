"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DealDetail, CommitteePassage } from "@/lib/data/dealDetail";
import { fmtM } from "@/lib/format";
import CommitteeFormModal from "./CommitteeFormModal";
import ConvertDealModal from "./ConvertDealModal";
import RejectDealModal from "./RejectDealModal";
import CommitteeDocs from "./CommitteeDocs";
import { setCommitteeValidation } from "@/app/(app)/pipeline/actions";
import { DEAL_COMMITTEE_OUTCOMES, isAdvancedStage } from "@/lib/ui-constants";
import SuiviTab from "@/components/shared/SuiviTab";
import EsgTab from "@/components/shared/EsgTab";
import KpiTab from "@/components/shared/KpiTab";
import DueDiligenceTab from "@/components/shared/DueDiligenceTab";
import ValueCreationTab from "@/components/shared/ValueCreationTab";
import EntityDocuments from "@/components/shared/EntityDocuments";
import EntityContacts from "@/components/shared/EntityContacts";
import { WriteAccessProvider, ReadOnlyNotice } from "@/components/shared/WriteAccess";
import DealNextStep from "./DealNextStep";
import ProgramMemberships from "@/components/portfolio/ProgramMemberships";

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

// L'ESG et la création de valeur n'ont pas de sens sur un dossier qu'on vient de sourcer :
// ils encombrent la fiche et laissent croire à un travail qui n'a pas lieu d'être fait.
const EARLY_TABS = ["Présentation", "Suivi", "Due diligence", "Comités", "KPIs", "Documents", "Contacts"];
const ADVANCED_ONLY = ["Création de valeur", "ESG"];
function tabsFor(stage: string | null): string[] {
  if (!isAdvancedStage(stage)) return EARLY_TABS;
  const t = [...EARLY_TABS];
  t.splice(5, 0, ...ADVANCED_ONLY); // juste après les KPIs, avant les documents
  return t;
}

function EmptyTab({ title, desc }: { title: string; desc: string }) {
  return <div className="card" style={{ padding: "32px 28px" }}><div className="serif" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{title}</div><div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6 }}>{desc}</div></div>;
}

export default function DealDetailClient({ deal, canEditComites = true, canValidateComites = false, canEdit = true }: { deal: DealDetail; canEditComites?: boolean; canValidateComites?: boolean; canEdit?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState(deal.committees.length ? "Comités" : "Présentation");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [comModal, setComModal] = useState<{ open: boolean; passage: CommitteePassage | null }>({ open: false, passage: null });
  const [comBusy, setComBusy] = useState<string | null>(null);

  async function toggleValidation(id: string, validate: boolean) {
    if (validate && !confirm("Valider officiellement cette décision de comité ? Le passage sera verrouillé.")) return;
    setComBusy(id);
    const res = await setCommitteeValidation(id, validate);
    setComBusy(null);
    if (res?.error) { alert(res.error); return; }
    router.refresh();
  }
  const [convertOpen, setConvertOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [stateBusy, setStateBusy] = useState(false);
  const tabs = tabsFor(deal.stage);
  // Un dossier peut reculer d'étape : l'onglet ouvert doit rester atteignable.
  const currentTab = tabs.includes(tab) ? tab : tabs[0];
  const stageBadge = STAGE_BADGE[deal.stage] ?? STAGE_BADGE["Sourcing"];
  const converted = !!deal.convertedCompanyId || deal.status === "investi";

  async function changeState(next: string) {
    setStateBusy(true);
    const payload: Record<string, unknown> = { deal_state: next };
    if (next !== "Écarté") payload.rejection_reason = null;
    await createClient().from("deals").update(payload).eq("id", deal.id);
    setStateBusy(false);
    router.refresh();
  }

  // Gouvernance : la conversion en participation exige une décision d'investissement favorable validée en comité.
  const hasValidatedInvestment = deal.committees.some(
    (c) => c.outcome === "Investissement" && c.status === "Validée" && (c.decision === "Favorable" || c.decision === "Favorable sous conditions")
  );
  function onConvertClick() {
    if (!hasValidatedInvestment) {
      alert("La conversion en participation nécessite d'abord une décision d'investissement favorable, validée en Comité d'investissement (onglet Comités).");
      setTab("Comités");
      return;
    }
    setConvertOpen(true);
  }

  async function removeCommittee(id: string) {
    if (!confirm("Supprimer ce passage en comité ?")) return;
    const supabase = createClient();
    await supabase.from("committee_passages").delete().eq("id", id);
    router.refresh();
  }

  const facts: [string, string][] = [
    ["Montant", fmtM(deal.amount)],
    ["Probabilité", deal.probability != null ? `${deal.probability} %` : "—"],
    ["Source", deal.source ? (deal.sourceDetail ? `${deal.source} — ${deal.sourceDetail}` : deal.source) : (deal.sourceDetail ?? "—")],
    ...(showAdvanced ? ([
      ["Valo pré-money", deal.valuationPre != null ? fmtM(deal.valuationPre) : "—"],
      ["Closing prévu", frMonth(deal.expectedClose)],
    ] as [string, string][]) : []),
    ["Chargé", deal.officer ?? "—"],
    ["Analyste", deal.analyst ?? "—"],
  ];

  return (
    <WriteAccessProvider canEdit={canEdit}>
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
            
          </div>
        </div>
        {converted ? (
          deal.convertedCompanyId ? (
            <button className="btn btn-ghost" onClick={() => router.push(`/portefeuille/${deal.convertedCompanyId}`)} style={{ flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              Voir la participation
            </button>
          ) : (
            <span className="badge badge-green" style={{ flexShrink: 0 }}>Investi</span>
          )
        ) : (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {/* La fiche d'instruction, pendant de la fiche société, dès le stade avancé. */}
            {isAdvancedStage(deal.stage) && (
              <button className="btn btn-ghost" onClick={() => router.push(`/pipeline/${deal.id}/fiche`)} title="Fiche d'instruction imprimable, au format de la fiche société">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></svg>
                Fiche d'instruction
              </button>
            )}
            {canEdit && (<button className="btn btn-ghost" onClick={() => router.push(`/saisie?scope=pipeline&entity=${deal.id}`)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Saisir un reporting
            </button>)}
            {canEdit && (<button className="btn btn-primary" onClick={onConvertClick} title={hasValidatedInvestment ? "" : "Nécessite une décision d'investissement validée en comité"} style={{ opacity: hasValidatedInvestment ? 1 : 0.55 }}>
              {!hasValidatedInvestment && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
              {hasValidatedInvestment && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
              Convertir en participation
            </button>)}
          </div>
        )}
      </div>

      {!converted && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14, padding: "9px 12px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--surface-cream)" }}>
          <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>État du dossier</span>
          {deal.dealState === "En veille" ? (
            <span className="badge badge-amber">En veille</span>
          ) : deal.dealState === "Écarté" ? (
            <span className="badge badge-neutral">Écarté{deal.rejectionReason ? ` · ${deal.rejectionReason}` : ""}</span>
          ) : (
            <span className="badge badge-green">Actif</span>
          )}
          <div style={{ marginLeft: "auto", display: canEdit ? "flex" : "none", gap: 6, flexWrap: "wrap" }}>
            {deal.dealState === "Actif" && (
              <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "5px 11px" }} disabled={stateBusy} onClick={() => changeState("En veille")}>Mettre en veille</button>
            )}
            {deal.dealState === "En veille" && (
              <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "5px 11px" }} disabled={stateBusy} onClick={() => changeState("Actif")}>Réactiver</button>
            )}
            {deal.dealState === "Écarté" ? (
              <button className="btn btn-primary" style={{ fontSize: 11.5, padding: "5px 11px" }} disabled={stateBusy} onClick={() => changeState("Actif")}>Réactiver le dossier</button>
            ) : (
              <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "5px 11px", color: "var(--red-fg)" }} disabled={stateBusy} onClick={() => setRejectOpen(true)}>Écarter</button>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${facts.length}, 1fr)`, gap: 10, marginBottom: 8 }}>
        {facts.map(([k, v]) => (
          <div key={k} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-2)" }}>{k}</div>
            <div className="serif tnum" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 18 }}>
        <button type="button" onClick={() => setShowAdvanced((a) => !a)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "var(--camel)" }}>
          {showAdvanced ? "− Masquer les champs avancés" : "+ Champs avancés (valo pré-money, closing)"}
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <ProgramMemberships entityType="deal" entityId={deal.id} programs={deal.programs} options={deal.programOptions} />
      </div>

      <DealNextStep dealId={deal.id} tasks={deal.tasks} postMortem={deal.postMortem} rejectionReason={deal.rejectionReason}
        rejected={deal.dealState === "Écarté"} onOpenSuivi={() => setTab("Suivi")} />

      <ReadOnlyNotice what="ce dossier" />

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {tabs.map((t) => {
          const on = t === currentTab;
          return <button key={t} onClick={() => setTab(t)} style={{ padding: "9px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12.5, fontWeight: on ? 600 : 500, color: on ? "var(--espresso)" : "var(--text-2)", borderBottom: `2px solid ${on ? "var(--espresso)" : "transparent"}`, marginBottom: -1 }}>{t}</button>;
        })}
      </div>

      {currentTab === "Présentation" && (
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Thèse d'investissement</div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.65 }}>{deal.thesis || "Non renseignée. Utilisez « Modifier » pour ajouter la thèse d'investissement."}</div>
        </div>
      )}

      {currentTab === "Comités" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Passages en comité <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— un dossier peut repasser plusieurs fois</span></div>
            {canEditComites && (
              <button className="btn btn-primary" onClick={() => setComModal({ open: true, passage: null })}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                Enregistrer un passage
              </button>
            )}
          </div>
          {deal.committees.length === 0 ? (
            <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun passage en comité{canEditComites ? ". Cliquez « Enregistrer un passage » pour ajouter un comité et son compte-rendu." : "."}</div>
          ) : (
            <div className="card" style={{ padding: "18px 20px" }}>
              {deal.committees.map((c, i) => {
                const last = i === deal.committees.length - 1;
                const col = DECISION_COLOR[c.decision ?? ""] ?? "var(--text-3)";
                const validated = c.status === "Validée";
                return (
                  <div key={c.id} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 13, height: 13, borderRadius: "50%", background: last ? col : "var(--surface)", border: `2px solid ${col}`, flexShrink: 0 }} />
                      {!last && <div style={{ flex: 1, width: 2, background: "var(--border)", margin: "2px 0" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.committeeType}</span>
                        {c.outcome && <span className="badge badge-amber">{c.outcome}</span>}
                        {c.decision && <span className={`badge ${DECISION_BADGE[c.decision] ?? "badge-neutral"}`}>{c.decision}</span>}
                        <span className={`badge ${validated ? "badge-green" : "badge-amber"}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {validated ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>Décision validée</> : "Proposée"}
                        </span>
                        <span className="row-actions" style={{ marginLeft: "auto" }}>
                          {canEditComites && !validated && <button onClick={() => setComModal({ open: true, passage: c })} aria-label="Modifier" title="Modifier"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>}
                          {canEditComites && !validated && <button onClick={() => removeCommittee(c.id)} aria-label="Supprimer" title="Supprimer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", margin: "2px 0 4px" }}>{c.sessionDate ? frMonth(c.sessionDate) : ""}{c.participants ? ` · ${c.participants}` : ""}{validated && c.validatedBy ? ` · validée par ${c.validatedBy}${c.validatedAt ? " le " + frMonth(c.validatedAt.slice(0, 10)) : ""}` : ""}</div>
                      {c.conditions && <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.5 }}>{c.conditions}</div>}
                      <CommitteeDocs dealId={deal.id} committeeId={c.id} docs={c.docs} />
                      {canValidateComites && (
                        <div style={{ marginTop: 8 }}>
                          {validated ? (
                            <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "5px 11px" }} disabled={comBusy === c.id} onClick={() => toggleValidation(c.id, false)}>{comBusy === c.id ? "…" : "Annuler la validation"}</button>
                          ) : (
                            <button className="btn btn-primary" style={{ fontSize: 11.5, padding: "5px 11px" }} disabled={comBusy === c.id} onClick={() => toggleValidation(c.id, true)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                              {comBusy === c.id ? "…" : "Valider la décision"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {currentTab === "Suivi" && <SuiviTab entityType="deal" entityId={deal.id} notes={deal.notes} tasks={deal.tasks} users={deal.users} />}
      {currentTab === "Due diligence" && <DueDiligenceTab entityType="deal" entityId={deal.id} items={deal.dueDiligence} users={deal.users} />}
      {currentTab === "KPIs" && <KpiTab entityType="deal" entityId={deal.id} kpis={deal.kpis} library={deal.kpiLibrary} />}
      {currentTab === "Création de valeur" && <ValueCreationTab entityType="deal" entityId={deal.id} items={deal.valueCreation} contacts={deal.contacts} users={deal.users} />}
      {currentTab === "ESG" && <EsgTab entityType="deal" entityId={deal.id} data={deal.esg} users={deal.users} />}

      {currentTab === "Documents" && <EntityDocuments entityType="deal" entityId={deal.id} entityName={deal.companyName} docs={deal.documents} />}

      {currentTab === "Contacts" && <EntityContacts entityType="deal" entityId={deal.id} contacts={deal.contacts} />}

      {comModal.open && <CommitteeFormModal dealId={deal.id} dealStage={deal.stage} outcomes={DEAL_COMMITTEE_OUTCOMES} passage={comModal.passage} onClose={() => setComModal({ open: false, passage: null })} />}
      {convertOpen && <ConvertDealModal deal={deal} onClose={() => setConvertOpen(false)} />}
      {rejectOpen && <RejectDealModal dealId={deal.id} onClose={() => setRejectOpen(false)} />}
    </div>
    </WriteAccessProvider>
  );
}
