"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyDetail } from "@/lib/data/companyDetail";
import { fmtM, fmtMult, fmtPct } from "@/lib/format";
import SuiviTab from "@/components/shared/SuiviTab";
import EsgTab from "@/components/shared/EsgTab";
import KpiTab from "@/components/shared/KpiTab";
import ValueCreationTab from "@/components/shared/ValueCreationTab";
import EntityDocuments from "@/components/shared/EntityDocuments";
import EntityContacts from "@/components/shared/EntityContacts";
import { BudgetTab, FlowsTab, CapTableTab } from "./CompanyFinanceTabs";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frMonth(d: string | null) { if (!d) return "—"; return `${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(2, 4)}`; }
function initials(name: string) { const caps = name.replace(/[^A-Z]/g, ""); return caps.length >= 2 ? caps.slice(0, 2) : name.slice(0, 2).toUpperCase(); }

const BASE_TABS = ["KPIs", "Suivi", "ESG", "Budget & BP", "Création de valeur", "Flux & Valorisation", "Cap table", "Documents", "Contacts"];
const DECISION_BADGE: Record<string, string> = { Favorable: "badge-green", "Favorable sous conditions": "badge-amber", Ajourné: "badge-neutral", Défavorable: "badge-red" };

function EmptyTab({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card" style={{ padding: "32px 28px" }}>
      <div className="serif" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

export default function CompanyDetailClient({ company }: { company: CompanyDetail }) {
  const router = useRouter();
  const [tab, setTab] = useState("KPIs");
  const equity = company.trackingType === "equity";
  const TABS = company.originDealId ? [...BASE_TABS, "Origine / instruction"] : BASE_TABS;

  const facts: [string, string][] = equity
    ? [["Investi", fmtM(company.invested)], ["Valeur", fmtM(company.valuation)], ["Multiple", fmtMult(company.tvpi)], ["TRI", fmtPct(company.tri)], ["Participation", company.ownership != null ? `${company.ownership} %` : "—"], ["Entrée", frMonth(company.investedDate)]]
    : [["Type", "Accompagnement"], ["Statut", company.status], ["Programme", company.programName ?? "—"], ["Suivie depuis", frMonth(company.investedDate)]];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <button onClick={() => router.push("/portefeuille")} aria-label="Retour" style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--brown)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{initials(company.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)" }}>{company.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            {equity ? "Participation" : "Accompagnement"} {company.status === "Actif" ? "active" : `· ${company.status}`}
            {company.originDealName && ` · issue du deal ${company.originDealName}`}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => router.push(`/saisie?scope=portefeuille&entity=${company.id}`)} style={{ flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Saisir un reporting
        </button>
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

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {TABS.map((t) => {
          const on = t === tab;
          return <button key={t} onClick={() => setTab(t)} style={{ padding: "9px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 12.5, fontWeight: on ? 600 : 500, color: on ? "var(--espresso)" : "var(--text-2)", borderBottom: `2px solid ${on ? "var(--espresso)" : "transparent"}`, marginBottom: -1 }}>{t}</button>;
        })}
      </div>

      {tab === "KPIs" && <KpiTab entityType="company" entityId={company.id} kpis={company.kpis} library={company.kpiLibrary} />}

      {tab === "Suivi" && <SuiviTab entityType="company" entityId={company.id} notes={company.notes} tasks={company.tasks} />}

      {tab === "ESG" && <EsgTab entityType="company" entityId={company.id} data={company.esg} />}
      {tab === "Budget & BP" && <BudgetTab companyId={company.id} rows={company.finance.financials} />}
      {tab === "Création de valeur" && <ValueCreationTab entityType="company" entityId={company.id} items={company.valueCreation} />}
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
    </div>
  );
}
