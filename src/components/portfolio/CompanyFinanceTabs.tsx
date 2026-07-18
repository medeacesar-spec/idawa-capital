"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import { FINANCIAL_LABELS, FLOW_TYPES, CAP_HOLDER_TYPES, VALUATION_METHODS, OHADA_PL_LINES } from "@/lib/ui-constants";
import { fmtM } from "@/lib/format";
import type { FinancialRow, FlowRow, CapRow } from "@/lib/data/companyFinance";
import { useYearWindow, YearNav, YEAR_WINDOW } from "./YearWindow";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDate(d: string | null) { if (!d) return "—"; return `${d.slice(8, 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`; }
const iconEdit = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>;
const iconDel = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>;
const iconAdd = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;

function useDel(table: string, label: string) {
  const router = useRouter();
  return async (id: string) => { if (!confirm(`Supprimer ${label} ?`)) return; await createClient().from(table).delete().eq("id", id); router.refresh(); };
}

function ValoSpark({ valos }: { valos: FlowRow[] }) {
  const w = 600, h = 70;
  const vals = valos.map((v) => v.amount ?? 0);
  let mn = Math.min(...vals), mx = Math.max(...vals);
  const pad = (mx - mn) * 0.15 || 1; mn -= pad; mx += pad;
  const X = (i: number) => 4 + (i * (w - 8)) / Math.max(1, valos.length - 1);
  const Y = (v: number) => h - 6 - ((v - mn) / (mx - mn)) * (h - 12);
  const pts = valos.map((v, i) => `${X(i).toFixed(1)},${Y(v.amount ?? 0).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke="var(--espresso)" strokeWidth="2" />
      {valos.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v.amount ?? 0)} r={i === valos.length - 1 ? 3.4 : 2.2} fill="var(--espresso)" />)}
    </svg>
  );
}

/* ---------- Budget & BP — grille OHADA (postes × années) ---------- */
export function BudgetTab({ companyId, rows }: { companyId: string; rows: FinancialRow[] }) {
  const router = useRouter();
  const [extraYears, setExtraYears] = useState<string[]>([]);
  const [newLines, setNewLines] = useState<string[]>([]);

  const thisYear = new Date().getFullYear();
  let allYears = Array.from(new Set([...rows.map((r) => r.period), ...extraYears]));
  for (let i = 0; allYears.length < YEAR_WINDOW; i++) allYears = Array.from(new Set([...allYears, String(thisYear + i)]));
  allYears.sort();

  // Grille en ordre chronologique : la fenêtre s'ouvre par défaut sur les exercices les plus récents.
  const win = useYearWindow(allYears, "end");
  const years = win.visible;

  const dataLabels = Array.from(new Set(rows.map((r) => r.label)));
  const customLabels = Array.from(new Set([
    ...dataLabels.filter((l) => !OHADA_PL_LINES.includes(l)),
    ...newLines.filter((l) => !OHADA_PL_LINES.includes(l)),
  ]));
  const lines = [...OHADA_PL_LINES, ...customLabels];
  const cellOf = (label: string, period: string) => rows.find((r) => r.label === label && r.period === period);

  async function save(label: string, period: string, field: "budget" | "actual", raw: string) {
    const v = raw.trim();
    const value = v === "" ? null : Math.round(Number(v.replace(",", ".")) * 1_000_000);
    if (value !== null && Number.isNaN(value)) return;
    const existing = cellOf(label, period);
    const supabase = createClient();
    if (existing) {
      if ((field === "budget" ? existing.budget : existing.actual) === value) return;
      await supabase.from("company_financials").update({ [field]: value }).eq("id", existing.id);
    } else {
      if (value === null) return;
      await supabase.from("company_financials").insert({ company_id: companyId, period, label, [field]: value });
    }
    router.refresh();
  }

  function addYear() {
    const max = allYears.reduce((a, y) => Math.max(a, parseInt(y, 10) || 0), thisYear);
    const next = String(max + 1);
    const updated = Array.from(new Set([...allYears, next])).sort();
    setExtraYears((e) => [...e, next]);
    win.reveal(updated.indexOf(next), updated.length); // faire défiler jusqu'au nouvel exercice
  }
  function addLine() {
    const name = prompt("Nom du nouveau poste :");
    if (name?.trim()) setNewLines((l) => [...l, name.trim()]);
  }
  async function renameLine(label: string) {
    const name = prompt("Renommer le poste :", label);
    if (!name?.trim() || name.trim() === label) return;
    await createClient().from("company_financials").update({ label: name.trim() }).eq("company_id", companyId).eq("label", label);
    setNewLines((l) => l.map((x) => (x === label ? name.trim() : x)));
    router.refresh();
  }
  async function clearLine(label: string) {
    if (!confirm(`Effacer les données du poste « ${label} » ?`)) return;
    await createClient().from("company_financials").delete().eq("company_id", companyId).eq("label", label);
    setNewLines((l) => l.filter((x) => x !== label));
    router.refresh();
  }

  const th: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" };
  // en-tête de sous-colonne : le padding droit compense celui de la cellule + celui du champ,
  // pour que « Budget » / « Réalisé » tombent pile au-dessus des chiffres.
  const thSub: React.CSSProperties = { ...th, padding: "6px 13px 6px 6px", width: 104 };
  const tdCell: React.CSSProperties = { padding: "4px 6px", width: 104 };
  const inp: React.CSSProperties = { width: "100%", padding: "5px 7px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 12, fontFamily: "inherit", textAlign: "right", outline: "none", background: "var(--surface)", color: "var(--ink)" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Budget & business plan <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— grille OHADA, budget vs réalisé, en M FCFA</span></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <YearNav win={win} label="années" />
          <button className="btn btn-ghost" onClick={addLine}>{iconAdd} Poste</button>
          <button className="btn btn-primary" onClick={addYear}>{iconAdd} Année</button>
        </div>
      </div>

      <div className="card" style={{ padding: "6px 14px", overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 300 + years.length * 190 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left", minWidth: 210 }}>Poste</th>
              {years.map((y) => (
                <th key={y} colSpan={2} style={{ ...th, textAlign: "center", borderLeft: "1px solid var(--sep)", color: "var(--camel)", fontSize: 11.5 }}>{y}</th>
              ))}
              <th style={{ ...th, width: 40 }}></th>
            </tr>
            <tr>
              <th style={{ ...th, textAlign: "left" }}></th>
              {years.map((y) => (
                <React.Fragment key={y}>
                  <th style={{ ...thSub, borderLeft: "1px solid var(--sep)" }}>Budget</th>
                  <th style={thSub}>Réalisé</th>
                </React.Fragment>
              ))}
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((label, i) => {
              const custom = !OHADA_PL_LINES.includes(label);
              return (
                <tr key={label} style={{ borderTop: i === 0 ? "1px solid var(--border)" : "1px solid var(--sep)" }}>
                  <td style={{ padding: "6px 8px", fontSize: 12.5, color: "var(--ink)", whiteSpace: "nowrap" }}>
                    {label}{custom && <span style={{ fontSize: 10, color: "var(--camel)", marginLeft: 6 }}>perso</span>}
                  </td>
                  {years.map((y) => {
                    const c = cellOf(label, y);
                    const b = c?.budget != null ? c.budget / 1_000_000 : "";
                    const a = c?.actual != null ? c.actual / 1_000_000 : "";
                    const off = c?.budget != null && c?.actual != null && c.actual < c.budget;
                    return (
                      <React.Fragment key={y}>
                        <td style={{ ...tdCell, borderLeft: "1px solid var(--sep)" }}>
                          <input key={`b${label}${y}${b}`} defaultValue={b} onBlur={(e) => save(label, y, "budget", e.target.value)} style={inp} inputMode="decimal" />
                        </td>
                        <td style={tdCell}>
                          <input key={`a${label}${y}${a}`} defaultValue={a} onBlur={(e) => save(label, y, "actual", e.target.value)}
                            style={{ ...inp, fontWeight: 600, color: off ? "var(--red-fg)" : "var(--ink)" }} inputMode="decimal" />
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td style={{ padding: "4px 2px" }}>
                    <span className="row-actions">
                      <button onClick={() => renameLine(label)} title="Renommer le poste">{iconEdit}</button>
                      <button onClick={() => clearLine(label)} title="Effacer la ligne">{iconDel}</button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 8 }}>
        Saisie directe en M FCFA (enregistrée en quittant la case). Grille OHADA standard — ajoutez vos propres postes, renommez-les, effacez une ligne. « + Année » ajoute une colonne ; les flèches font défiler les exercices, aucune année n&apos;est perdue.
      </div>
    </div>
  );
}

function BudgetModal({ companyId, row, onClose }: { companyId: string; row: FinancialRow | null; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState(row?.period ?? String(new Date().getFullYear()));
  const [label, setLabel] = useState(row?.label ?? FINANCIAL_LABELS[0]);
  const [budget, setBudget] = useState(row?.budget != null ? String(row.budget) : "");
  const [actual, setActual] = useState(row?.actual != null ? String(row.actual) : "");
  async function save() {
    if (!period.trim() || !label.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const payload = { company_id: companyId, period: period.trim(), label: label.trim(), budget: budget ? Number(budget) : null, actual: actual ? Number(actual) : null };
    if (row) await supabase.from("company_financials").update(payload).eq("id", row.id);
    else await supabase.from("company_financials").insert(payload);
    onClose(); router.refresh();
  }
  return (
    <Modal title={row ? "Modifier la ligne" : "Ajouter une ligne budgétaire"} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "…" : "Enregistrer"}</button></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Période"><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Ex : 2025 ou 2025-T1" /></Field>
        <Field label="Poste"><Input list="fin-labels" value={label} onChange={(e) => setLabel(e.target.value)} /><datalist id="fin-labels">{FINANCIAL_LABELS.map((l) => <option key={l} value={l} />)}</datalist></Field>
        <Field label="Budget (FCFA)"><Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} /></Field>
        <Field label="Réalisé (FCFA)"><Input type="number" value={actual} onChange={(e) => setActual(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/* ---------- Flux & Valorisation ---------- */
export function FlowsTab({ companyId, rows }: { companyId: string; rows: FlowRow[] }) {
  const [modal, setModal] = useState<{ open: boolean; row: FlowRow | null }>({ open: false, row: null });
  const del = useDel("company_flows", "ce flux");
  const calls = rows.filter((r) => r.type === "Appel de fonds").reduce((s, r) => s + (r.amount ?? 0), 0);
  const dists = rows.filter((r) => r.type === "Distribution").reduce((s, r) => s + (r.amount ?? 0), 0);
  const valos = rows.filter((r) => r.type === "Valorisation" && r.amount != null).sort((a, b) => (a.flowDate ?? "").localeCompare(b.flowDate ?? ""));
  const lastVal = valos[valos.length - 1];
  const TYPE_COLOR: Record<string, string> = { "Appel de fonds": "badge-amber", "Distribution": "badge-green", "Valorisation": "badge-neutral" };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        <div className="card" style={{ padding: "12px 14px" }}><div style={{ fontSize: 11, color: "var(--text-2)" }}>Appels de fonds</div><div className="serif tnum" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginTop: 3 }}>{fmtM(calls)}</div></div>
        <div className="card" style={{ padding: "12px 14px" }}><div style={{ fontSize: 11, color: "var(--text-2)" }}>Distributions</div><div className="serif tnum" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginTop: 3 }}>{fmtM(dists)}</div></div>
        <div className="card" style={{ padding: "12px 14px" }}><div style={{ fontSize: 11, color: "var(--text-2)" }}>Dernière valorisation</div><div className="serif tnum" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginTop: 3 }}>{lastVal?.amount != null ? fmtM(lastVal.amount) : "—"}</div>{lastVal?.method && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{lastVal.method}</div>}</div>
      </div>

      {valos.length >= 1 && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>Historique de valorisation <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— daté, avec méthode</span></div>
          {valos.length >= 2 && <ValoSpark valos={valos} />}
          <div style={{ display: "grid", gap: 8, marginTop: valos.length >= 2 ? 12 : 0 }}>
            {[...valos].reverse().map((v) => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11.5, color: "var(--text-3)", minWidth: 92 }}>{frDate(v.flowDate)}</span>
                <span className="tnum serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", minWidth: 90 }}>{fmtM(v.amount ?? 0)}</span>
                {v.method && <span className="badge badge-neutral">{v.method}</span>}
                {v.note && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{v.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Historique des flux</div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, row: null })}>{iconAdd} Ajouter un flux</button>
      </div>
      {rows.length === 0 ? (
        <div className="card" style={{ padding: "22px", textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>Aucun flux. Enregistrez appels de fonds, distributions et valorisations.</div>
      ) : (
        <div className="card" style={{ padding: "4px 18px" }}>
          {rows.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
              <span style={{ fontSize: 11.5, color: "var(--text-3)", minWidth: 92 }}>{frDate(r.flowDate)}</span>
              {r.type && <span className={`badge ${TYPE_COLOR[r.type] ?? "badge-neutral"}`}>{r.type}</span>}
              <span style={{ flex: 1, fontSize: 12, color: "var(--text-2)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.type === "Valorisation" && r.method ? r.method : r.note}</span>
              <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.amount != null ? fmtM(r.amount) : "—"}</span>
              <span className="row-actions"><button onClick={() => setModal({ open: true, row: r })}>{iconEdit}</button><button onClick={() => del(r.id)}>{iconDel}</button></span>
            </div>
          ))}
        </div>
      )}
      {modal.open && <FlowModal companyId={companyId} row={modal.row} onClose={() => setModal({ open: false, row: null })} />}
    </div>
  );
}

function FlowModal({ companyId, row, onClose }: { companyId: string; row: FlowRow | null; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState(row?.type ?? FLOW_TYPES[0]);
  const [date, setDate] = useState(row?.flowDate ?? "");
  const [amount, setAmount] = useState(row?.amount != null ? String(row.amount) : "");
  const [note, setNote] = useState(row?.note ?? "");
  const [method, setMethod] = useState(row?.method ?? VALUATION_METHODS[0]);
  const isValo = type === "Valorisation";
  async function save() {
    if (!amount) return;
    setBusy(true);
    const supabase = createClient();
    const payload = { company_id: companyId, type, flow_date: date || null, amount: Number(amount), note: note.trim() || null, method: isValo ? method : null };
    if (row) await supabase.from("company_flows").update(payload).eq("id", row.id);
    else await supabase.from("company_flows").insert(payload);
    onClose(); router.refresh();
  }
  return (
    <Modal title={row ? "Modifier le flux" : "Ajouter un flux"} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={busy || !amount} onClick={save}>{busy ? "…" : "Enregistrer"}</button></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}>{FLOW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      <Field label={isValo ? "Valorisation (FCFA)" : "Montant (FCFA)"}><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      {isValo && <Field label="Méthode de valorisation"><Select value={method} onChange={(e) => setMethod(e.target.value)}>{VALUATION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</Select></Field>}
      <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : 2e tranche, dividende…" /></Field>
    </Modal>
  );
}

/* ---------- Cap table ---------- */
export function CapTableTab({ companyId, rows }: { companyId: string; rows: CapRow[] }) {
  const [modal, setModal] = useState<{ open: boolean; row: CapRow | null }>({ open: false, row: null });
  const del = useDel("company_captable", "cette ligne");
  const totalPct = rows.reduce((s, r) => s + (r.pct ?? 0), 0);
  const TYPE_COLOR: Record<string, string> = { "Fondateur": "#8A5A18", "Idawa Capital": "#4A2617", "Co-investisseur": "#185FA5", "ESOP / salariés": "#3B6D11", "Autre": "#6B5744" };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Table de capitalisation <span style={{ fontWeight: 400, color: totalPct === 100 ? "var(--green-fg)" : "var(--text-3)" }}>— total {totalPct}%{totalPct !== 100 ? " (≠ 100)" : ""}</span></div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, row: null })}>{iconAdd} Ajouter un actionnaire</button>
      </div>
      {rows.length === 0 ? (
        <div className="card" style={{ padding: "22px", textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>Aucune ligne. Renseignez fondateurs, Idawa, co-investisseurs, pool ESOP…</div>
      ) : (
        <div className="card" style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
            {rows.map((r) => <div key={r.id} title={`${r.holder} ${r.pct ?? 0}%`} style={{ width: `${r.pct ?? 0}%`, background: TYPE_COLOR[r.holderType ?? "Autre"] ?? "#6B5744" }} />)}
          </div>
          {rows.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: TYPE_COLOR[r.holderType ?? "Autre"] ?? "#6B5744", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.holder}</div>{r.holderType && <div style={{ fontSize: 11, color: "var(--text-3)" }}>{r.holderType}</div>}</div>
              <span className="tnum" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{r.pct != null ? `${r.pct}%` : "—"}</span>
              <span className="row-actions"><button onClick={() => setModal({ open: true, row: r })}>{iconEdit}</button><button onClick={() => del(r.id)}>{iconDel}</button></span>
            </div>
          ))}
        </div>
      )}
      {modal.open && <CapModal companyId={companyId} row={modal.row} onClose={() => setModal({ open: false, row: null })} />}
    </div>
  );
}

function CapModal({ companyId, row, onClose }: { companyId: string; row: CapRow | null; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [holder, setHolder] = useState(row?.holder ?? "");
  const [type, setType] = useState(row?.holderType ?? CAP_HOLDER_TYPES[0]);
  const [pct, setPct] = useState(row?.pct != null ? String(row.pct) : "");
  const [note, setNote] = useState(row?.note ?? "");
  async function save() {
    if (!holder.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const payload = { company_id: companyId, holder: holder.trim(), holder_type: type, pct: pct ? Number(pct) : null, note: note.trim() || null };
    if (row) await supabase.from("company_captable").update(payload).eq("id", row.id);
    else await supabase.from("company_captable").insert(payload);
    onClose(); router.refresh();
  }
  return (
    <Modal title={row ? "Modifier l'actionnaire" : "Ajouter un actionnaire"} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={busy || !holder.trim()} onClick={save}>{busy ? "…" : "Enregistrer"}</button></>}>
      <Field label="Actionnaire"><Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Ex : Fondateur, Idawa Capital…" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}>{CAP_HOLDER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
        <Field label="Part (%)"><Input type="number" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="Ex : 25" /></Field>
      </div>
      <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optionnel" /></Field>
    </Modal>
  );
}
