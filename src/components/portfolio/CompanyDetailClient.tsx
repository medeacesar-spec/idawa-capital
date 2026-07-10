"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CompanyDetail, KpiSeries } from "@/lib/data/companyDetail";
import { fmtM, fmtMult, fmtPct } from "@/lib/format";
import SuiviTab from "@/components/shared/SuiviTab";
import EsgTab from "@/components/shared/EsgTab";
import { BudgetTab, FlowsTab, CapTableTab } from "./CompanyFinanceTabs";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frMonth(d: string | null) { if (!d) return "—"; return `${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(2, 4)}`; }
function shortPeriod(p: string) { const m = p.match(/(\d{4})-T(\d)/); return m ? `T${m[2]}-${m[1].slice(2)}` : p; }
function initials(name: string) { const caps = name.replace(/[^A-Z]/g, ""); return caps.length >= 2 ? caps.slice(0, 2) : name.slice(0, 2).toUpperCase(); }
function nf(n: number) { return new Intl.NumberFormat("fr-FR").format(Math.round(n)); }

const CATS = ["Management", "Commercial", "Production", "Support"];
const BASE_TABS = ["KPIs", "Suivi", "ESG", "Budget & BP", "Création de valeur", "Flux & Valorisation", "Cap table", "Documents", "Contacts"];
const DECISION_BADGE: Record<string, string> = { Favorable: "badge-green", "Favorable sous conditions": "badge-amber", Ajourné: "badge-neutral", Défavorable: "badge-red" };

function Chart({ k }: { k: KpiSeries }) {
  const w = 400, h = 110;
  const s = k.series;
  if (s.length < 2) return <div style={{ fontSize: 12, color: "var(--text-3)", padding: "20px 0", textAlign: "center" }}>Pas assez de données pour tracer la courbe.</div>;
  const vals = s.map((x) => x.value);
  const all = k.target != null ? [...vals, k.target] : vals;
  let mn = Math.min(...all), mx = Math.max(...all);
  const pad = (mx - mn) * 0.15 || 1; mn -= pad; mx += pad;
  const X = (i: number) => 6 + (i * (w - 12)) / (s.length - 1);
  const Y = (v: number) => h - 8 - ((v - mn) / (mx - mn)) * (h - 20);
  const pts = s.map((x, i) => `${X(i).toFixed(1)},${Y(x.value).toFixed(1)}`).join(" ");
  const last = vals[vals.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
      {k.target != null && <line x1="6" y1={Y(k.target)} x2={w - 6} y2={Y(k.target)} stroke="var(--camel)" strokeWidth="1.6" strokeDasharray="5 4" />}
      <polyline points={pts} fill="none" stroke="var(--espresso)" strokeWidth="2.2" />
      {s.map((x, i) => <circle key={i} cx={X(i)} cy={Y(x.value)} r={i === s.length - 1 ? 3.6 : 2.2} fill="var(--espresso)" />)}
      <line x1="6" y1={Y(last)} x2="6" y2={Y(last)} />
    </svg>
  );
}

function KpiCard({ k }: { k: KpiSeries }) {
  const s = k.series;
  const last = s.length ? s[s.length - 1].value : 0;
  const prev = s.length > 1 ? s[s.length - 2].value : last;
  const chg = prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : 0;
  const good = k.target == null ? true : k.direction === "low" ? last <= k.target : last >= k.target;
  const up = chg >= 0;
  return (
    <div className="card" style={{ padding: "14px 15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{k.name}</span>
        <span className={`badge ${good ? "badge-green" : "badge-amber"}`}>{good ? "Sur objectif" : "En retard"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span className="serif tnum" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>{nf(last)}{k.unit ? ` ${k.unit}` : ""}</span>
        {s.length > 1 && <span style={{ fontSize: 11.5, fontWeight: 600, color: up ? "var(--green-fg)" : "var(--red-fg)" }}>{up ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}%</span>}
      </div>
      <Chart k={k} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-3)", marginTop: 5 }}>
        <span>{s.length ? shortPeriod(s[0].period) : ""}</span>
        {k.target != null && <span style={{ color: "var(--camel)", fontWeight: 600 }}>— cible {nf(k.target)}{k.unit ? ` ${k.unit}` : ""}</span>}
        <span>{s.length ? shortPeriod(s[s.length - 1].period) : ""}</span>
      </div>
    </div>
  );
}

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
  const [cat, setCat] = useState("Management");
  const equity = company.trackingType === "equity";
  const TABS = company.originDealId ? [...BASE_TABS, "Origine / instruction"] : BASE_TABS;

  const facts: [string, string][] = equity
    ? [["Investi", fmtM(company.invested)], ["Valeur", fmtM(company.valuation)], ["Multiple", fmtMult(company.tvpi)], ["TRI", fmtPct(company.tri)], ["Participation", company.ownership != null ? `${company.ownership} %` : "—"], ["Entrée", frMonth(company.investedDate)]]
    : [["Type", "Accompagnement"], ["Statut", company.status], ["Programme", company.programName ?? "—"], ["Suivie depuis", frMonth(company.investedDate)]];

  const kpisInCat = company.kpis.filter((k) => k.category === cat);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <button onClick={() => router.push("/portefeuille")} aria-label="Retour" style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--brown)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{initials(company.name)}</div>
        <div>
          <div className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)" }}>{company.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            {equity ? "Participation" : "Accompagnement"} {company.status === "Actif" ? "active" : `· ${company.status}`}
            {company.originDealName && ` · issue du deal ${company.originDealName}`}
          </div>
        </div>
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

      {tab === "KPIs" && (
        equity || company.kpis.length > 0 ? (
          <div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
              {CATS.map((cc) => {
                const on = cc === cat;
                const count = company.kpis.filter((k) => k.category === cc).length;
                return <button key={cc} onClick={() => setCat(cc)} style={{ padding: "6px 13px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)", border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}` }}>{cc}{count > 0 ? ` (${count})` : ""}</button>;
              })}
            </div>
            {kpisInCat.length === 0 ? (
              <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun KPI « {cat} » suivi. <Link href="/saisie" style={{ color: "var(--camel)", fontWeight: 600 }}>Saisir un reporting</Link> pour en ajouter.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                {kpisInCat.map((k) => <KpiCard key={k.id} k={k} />)}
              </div>
            )}
          </div>
        ) : <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun KPI suivi. <Link href="/saisie" style={{ color: "var(--camel)", fontWeight: 600 }}>Saisir un reporting</Link>.</div>
      )}

      {tab === "Suivi" && <SuiviTab entityType="company" entityId={company.id} notes={company.notes} tasks={company.tasks} />}

      {tab === "ESG" && <EsgTab entityType="company" entityId={company.id} data={company.esg} />}
      {tab === "Budget & BP" && <BudgetTab companyId={company.id} rows={company.finance.financials} />}
      {tab === "Création de valeur" && <EmptyTab title="Plan de création de valeur" desc="Les initiatives de création de valeur (expansion, gouvernance, recrutements clés…) avec leur avancement." />}
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

      {tab === "Documents" && (
        company.documents.length === 0 ? <EmptyTab title="Documents" desc="Aucun document pour cette société. Ajoutez-en depuis l'onglet Documents." /> : (
          <div className="card" style={{ padding: "4px 18px" }}>
            {company.documents.map((d, i) => (
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
        company.contacts.length === 0 ? <EmptyTab title="Contacts" desc="Aucun contact rattaché à cette société." /> : (
          <div className="card" style={{ padding: "4px 18px" }}>
            {company.contacts.map((ct, i) => (
              <div key={ct.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--espresso)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{initials(ct.name)}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{ct.name}</div><div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{ct.function ?? "—"}</div></div>
                {ct.email && <a href={`mailto:${ct.email}`} style={{ fontSize: 11.5, color: "var(--camel)" }}>{ct.email}</a>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
