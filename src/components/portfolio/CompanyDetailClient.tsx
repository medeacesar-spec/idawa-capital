"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyDetail, CompanyDecision } from "@/lib/data/companyDetail";
import { fmtM, fmtMult, fmtPct } from "@/lib/format";
import CommitteeFormModal from "@/components/pipeline/CommitteeFormModal";
import CommitteeDocs from "@/components/pipeline/CommitteeDocs";
import { setCompanyDecisionValidation } from "@/app/(app)/portefeuille/actions";
import { COMPANY_COMMITTEE_OUTCOMES } from "@/lib/ui-constants";
import SuiviTab from "@/components/shared/SuiviTab";
import EsgTab from "@/components/shared/EsgTab";
import KpiTab from "@/components/shared/KpiTab";
import ValueCreationTab from "@/components/shared/ValueCreationTab";
import EntityDocuments from "@/components/shared/EntityDocuments";
import EntityContacts from "@/components/shared/EntityContacts";
import { WriteAccessProvider, ReadOnlyNotice } from "@/components/shared/WriteAccess";
import { BudgetTab, FlowsTab, CapTableTab } from "./CompanyFinanceTabs";
import InstrumentsTab from "./InstrumentsTab";
import RepaymentsTab from "./RepaymentsTab";
import StructurationTab from "./StructurationTab";
import FinancialStatementsTab from "./FinancialStatementsTab";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frMonth(d: string | null) { if (!d) return "—"; return `${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(2, 4)}`; }
function initials(name: string) { const caps = name.replace(/[^A-Z]/g, ""); return caps.length >= 2 ? caps.slice(0, 2) : name.slice(0, 2).toUpperCase(); }

const BASE_TABS = ["Investissement", "Remboursements", "Structuration", "États financiers", "KPIs", "Suivi", "Décisions", "ESG", "Budget & BP", "Création de valeur", "Flux & Valorisation", "Cap table", "Documents", "Contacts"];
const DECISION_BADGE: Record<string, string> = { Favorable: "badge-green", "Favorable sous conditions": "badge-amber", Ajourné: "badge-neutral", Défavorable: "badge-red" };
// Rouge = la participation se termine ; ambre = signal de vigilance ; vert = engagement accru.
const OUTCOME_BADGE: Record<string, string> = {
  "Réinvestissement": "badge-green", "Sortie partielle": "badge-neutral", "Sortie complète": "badge-neutral",
  "Radiation": "badge-red", "Dépréciation": "badge-amber", "Restructuration": "badge-amber",
  "Conversion": "badge-neutral", "Distribution": "badge-green", "Mise sous surveillance": "badge-amber",
};

function EmptyTab({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card" style={{ padding: "32px 28px" }}>
      <div className="serif" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

export default function CompanyDetailClient({ company, canEditComites = true, canValidateComites = false, canEdit = true }: { company: CompanyDetail; canEditComites?: boolean; canValidateComites?: boolean; canEdit?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState("KPIs");
  const [decModal, setDecModal] = useState<{ open: boolean; passage: CompanyDecision | null }>({ open: false, passage: null });
  const [decBusy, setDecBusy] = useState<string | null>(null);
  const equity = company.trackingType === "equity";
  const TABS = company.originDealId ? [...BASE_TABS, "Origine / instruction"] : BASE_TABS;
  const isClosed = company.status === "Sorti" || company.status === "Radié";

  async function toggleDecision(id: string, validate: boolean) {
    if (validate && !confirm("Valider officiellement cette décision de comité ? Le statut de la société sera mis à jour et la décision verrouillée.")) return;
    setDecBusy(id);
    const res = await setCompanyDecisionValidation(id, validate);
    setDecBusy(null);
    if (res?.error) { alert(res.error); return; }
    router.refresh();
  }
  async function removeDecision(id: string) {
    if (!confirm("Supprimer cette décision de comité ?")) return;
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().from("committee_passages").delete().eq("id", id);
    router.refresh();
  }

  const facts: [string, string][] = equity
    ? [["Investi", fmtM(company.invested)], ["Valorisation", fmtM(company.valuation)], ["Multiple", fmtMult(company.tvpi)], ["TRI", fmtPct(company.tri)], ["Participation", company.ownership != null ? `${company.ownership} %` : "—"], ["Entrée", frMonth(company.investedDate)]]
    : [["Type", "Accélération"], ["Statut", company.status], ["Programme", company.programName ?? "—"], ["Suivie depuis", frMonth(company.investedDate)]];

  return (
    <WriteAccessProvider canEdit={canEdit}>
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <button onClick={() => router.push("/portefeuille")} aria-label="Retour" style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--brown)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{initials(company.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)" }}>{company.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            {equity ? "Participation" : "Accélération"} {company.status === "Actif" ? "active" : `· ${company.status}`}
            {company.originDealName && ` · issue du deal ${company.originDealName}`}
          </div>
        </div>
        {canEdit && (<button className="btn btn-ghost" onClick={() => router.push(`/saisie?scope=portefeuille&entity=${company.id}`)} style={{ flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Saisir un reporting
        </button>)}
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {company.sector && <span style={{ padding: "3px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: "var(--espresso)", color: "#fff" }}>{company.sector}</span>}
        {company.programName && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border-strong)" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: company.programColor ?? "var(--text-3)" }} />{company.programName}</span>}
      </div>

      {/* Facts */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${facts.length}, 1fr)`, gap: 10, marginBottom: 18 }}>
        {facts.map(([k, v]) => (
          <div key={k} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-2)" }}>{k}</div>
            <div className="serif tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      <ReadOnlyNotice what="cette société" />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {TABS.map((t) => {
          const on = t === tab;
          return <button key={t} onClick={() => setTab(t)} style={{ padding: "9px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12.5, fontWeight: on ? 600 : 500, color: on ? "var(--espresso)" : "var(--text-2)", borderBottom: `2px solid ${on ? "var(--espresso)" : "transparent"}`, marginBottom: -1 }}>{t}</button>;
        })}
      </div>

      {tab === "Investissement" && <InstrumentsTab companyId={company.id} instruments={company.instruments} />}

      {tab === "Remboursements" && <RepaymentsTab instruments={company.instruments} />}

      {tab === "Structuration" && <StructurationTab companyId={company.id} data={company.structuration} />}

      {tab === "États financiers" && <FinancialStatementsTab companyId={company.id} values={company.statements} />}

      {tab === "KPIs" && <KpiTab entityType="company" entityId={company.id} kpis={company.kpis} library={company.kpiLibrary} statements={company.statements} budget={company.finance.financials} />}

      {tab === "Suivi" && <SuiviTab entityType="company" entityId={company.id} notes={company.notes} tasks={company.tasks} users={company.users} />}

      {tab === "Décisions" && (
        <div>
          <div className="card" style={{ padding: "14px 18px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6, maxWidth: 560 }}>
              La <b style={{ color: "var(--ink)" }}>sortie</b> ou la <b style={{ color: "var(--ink)" }}>radiation</b> d'une participation se décide en <b style={{ color: "var(--ink)" }}>Comité d'investissement</b> et doit être <b style={{ color: "var(--ink)" }}>validée par la Direction</b>. Le statut de la société bascule automatiquement à la validation.
              <span style={{ display: "block", marginTop: 6 }}>Statut actuel : <span className="badge" style={{ background: isClosed ? "var(--red-bg)" : "var(--green-bg)", color: isClosed ? "var(--red-fg)" : "var(--green-fg)" }}>{company.status}</span></span>
            </div>
            {canEditComites && !isClosed && (
              <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={() => setDecModal({ open: true, passage: null })}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                Enregistrer une décision
              </button>
            )}
          </div>
          {company.decisions.length === 0 ? (
            <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucune décision de comité enregistrée sur cette participation.</div>
          ) : (
            <div className="card" style={{ padding: "18px 20px" }}>
              {company.decisions.map((c, i) => {
                const last = i === company.decisions.length - 1;
                const validated = c.status === "Validée";
                const col = validated ? "var(--green-fg)" : "var(--camel)";
                return (
                  <div key={c.id} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 13, height: 13, borderRadius: "50%", background: last ? col : "var(--surface)", border: `2px solid ${col}`, flexShrink: 0 }} />
                      {!last && <div style={{ flex: 1, width: 2, background: "var(--border)", margin: "2px 0" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.committeeType}</span>
                        {c.outcome && <span className={`badge ${OUTCOME_BADGE[c.outcome] ?? "badge-neutral"}`}>{c.outcome}</span>}
                        {c.decision && <span className={`badge ${DECISION_BADGE[c.decision] ?? "badge-neutral"}`}>{c.decision}</span>}
                        <span className={`badge ${validated ? "badge-green" : "badge-amber"}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {validated ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>Validée</> : "Proposée"}
                        </span>
                        <span className="row-actions" style={{ marginLeft: "auto" }}>
                          {canEditComites && !validated && <button onClick={() => setDecModal({ open: true, passage: c })} aria-label="Modifier" title="Modifier"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>}
                          {canEditComites && !validated && <button onClick={() => removeDecision(c.id)} aria-label="Supprimer" title="Supprimer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", margin: "2px 0 4px" }}>{c.sessionDate ? frMonth(c.sessionDate) : ""}{c.participants ? ` · ${c.participants}` : ""}{validated && c.validatedBy ? ` · validée par ${c.validatedBy}${c.validatedAt ? " le " + frMonth(c.validatedAt.slice(0, 10)) : ""}` : ""}</div>
                      {c.conditions && <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.5 }}>{c.conditions}</div>}
                      <CommitteeDocs companyId={company.id} committeeId={c.id} docs={c.docs} />
                      {canValidateComites && (
                        <div style={{ marginTop: 8 }}>
                          {validated ? (
                            <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "5px 11px" }} disabled={decBusy === c.id} onClick={() => toggleDecision(c.id, false)}>{decBusy === c.id ? "…" : "Annuler la validation"}</button>
                          ) : (
                            <button className="btn btn-primary" style={{ fontSize: 11.5, padding: "5px 11px" }} disabled={decBusy === c.id} onClick={() => toggleDecision(c.id, true)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                              {decBusy === c.id ? "…" : "Valider la décision"}
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

      {tab === "ESG" && <EsgTab entityType="company" entityId={company.id} data={company.esg} users={company.users} />}
      {tab === "Budget & BP" && <BudgetTab companyId={company.id} rows={company.finance.financials} />}
      {tab === "Création de valeur" && <ValueCreationTab entityType="company" entityId={company.id} items={company.valueCreation} contacts={company.contacts} users={company.users} />}
      {tab === "Flux & Valorisation" && <FlowsTab companyId={company.id} rows={company.finance.flows} />}
      {tab === "Cap table" && <CapTableTab companyId={company.id} rows={company.finance.capTable} />}

      {tab === "Origine / instruction" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>Historique d'instruction repris du dossier <b style={{ color: "var(--ink)" }}>{company.originDealName ?? "d'origine"}</b>.</div>
            {company.originDealId && <button className="btn btn-ghost" onClick={() => router.push(`/pipeline/${company.originDealId}`)}>Ouvrir le dossier d'origine</button>}
          </div>

          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Passages en comité</div>
            {company.originCommittees.length === 0 ? (
              <div className="card" style={{ padding: "20px", textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>Aucun passage en comité enregistré pendant l'instruction.</div>
            ) : (
              <div className="card" style={{ padding: "14px 18px", display: "grid", gap: 12 }}>
                {company.originCommittees.map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--camel)", marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{c.committeeType}</span>
                        {c.decision && <span className={`badge ${DECISION_BADGE[c.decision] ?? "badge-neutral"}`}>{c.decision}</span>}
                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{frMonth(c.sessionDate)}</span>
                      </div>
                      {c.conditions && <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.5, marginTop: 2 }}>{c.conditions}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {company.originNotes.length > 0 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Notes d'instruction</div>
              <div className="card" style={{ padding: "14px 18px", display: "grid", gap: 10 }}>
                {company.originNotes.map((n) => (
                  <div key={n.id} style={{ borderTop: "1px solid var(--sep)", paddingTop: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>{n.type ?? "Note"} · {frMonth(n.noteDate)}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.55 }}>{n.summary}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "Documents" && <EntityDocuments entityType="company" entityId={company.id} entityName={company.name} docs={company.documents} />}

      {tab === "Contacts" && <EntityContacts entityType="company" entityId={company.id} contacts={company.contacts} />}

      {decModal.open && (
        <CommitteeFormModal
          companyId={company.id}
          outcomes={COMPANY_COMMITTEE_OUTCOMES}
          defaultType="Comité d'investissement"
          passage={decModal.passage}
          onClose={() => setDecModal({ open: false, passage: null })}
        />
      )}
    </div>
    </WriteAccessProvider>
  );
}
