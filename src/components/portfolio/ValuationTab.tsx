"use client";

// Valorisation — cadence ANNUELLE, arrêtée par le comité d'audit.
//
// Retour de Nouss Bih (I&P) : une valorisation ne se révise pas en continu comme un flux.
// Elle est proposée, puis validée une fois par exercice, et c'est seulement à ce moment
// qu'elle devient le chiffre de référence. La performance commerciale et financière suit
// un tout autre rythme — trimestriel — et vit donc sur d'autres écrans.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtM } from "@/lib/format";
import { VALUATION_METHODS } from "@/lib/ui-constants";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useCanEdit } from "@/components/shared/WriteAccess";
import { setValuationValidation } from "@/app/(app)/portefeuille/actions";
import type { FlowRow } from "@/lib/data/companyFinance";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const frDate = (d: string | null) => (!d ? "—" : `${d.slice(8, 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`);

function Spark({ points }: { points: FlowRow[] }) {
  const w = 600, h = 70;
  const vals = points.map((v) => v.amount ?? 0);
  let mn = Math.min(...vals), mx = Math.max(...vals);
  const pad = (mx - mn) * 0.15 || 1; mn -= pad; mx += pad;
  const X = (i: number) => 4 + (i * (w - 8)) / Math.max(1, points.length - 1);
  const Y = (v: number) => h - 6 - ((v - mn) / (mx - mn)) * (h - 12);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={points.map((v, i) => `${X(i).toFixed(1)},${Y(v.amount ?? 0).toFixed(1)}`).join(" ")} fill="none" stroke="var(--espresso)" strokeWidth="2" />
      {points.map((v, i) => <circle key={v.id} cx={X(i)} cy={Y(v.amount ?? 0)} r={i === points.length - 1 ? 3.4 : 2.2} fill="var(--espresso)" />)}
    </svg>
  );
}

export default function ValuationTab({ companyId, rows, canValidate = false }: {
  companyId: string; rows: FlowRow[]; canValidate?: boolean;
}) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [modal, setModal] = useState<{ open: boolean; row: FlowRow | null }>({ open: false, row: null });
  const [busy, setBusy] = useState<string | null>(null);

  const valuations = rows
    .filter((r) => r.type === "Valorisation")
    .sort((a, b) => (b.fiscalYear ?? 0) - (a.fiscalYear ?? 0) || (b.flowDate ?? "").localeCompare(a.flowDate ?? ""));
  const validated = valuations.filter((v) => v.status === "Validée").sort((a, b) => (a.fiscalYear ?? 0) - (b.fiscalYear ?? 0));
  const current = validated[validated.length - 1];
  const previous = validated[validated.length - 2];
  const change = current && previous && previous.amount ? ((current.amount ?? 0) - (previous.amount ?? 0)) / Math.abs(previous.amount) : null;

  async function toggle(row: FlowRow, validate: boolean) {
    if (validate && !confirm(`Arrêter la valorisation ${row.fiscalYear} à ${fmtM(row.amount ?? 0)} ? Elle deviendra le chiffre de référence.`)) return;
    setBusy(row.id);
    const res = await setValuationValidation(row.id, validate);
    setBusy(null);
    if (res?.error) { alert(res.error); return; }
    router.refresh();
  }
  async function remove(row: FlowRow) {
    if (!confirm(`Supprimer la valorisation ${row.fiscalYear} ?`)) return;
    await createClient().from("company_flows").delete().eq("id", row.id);
    router.refresh();
  }

  const th: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "7px 8px", fontSize: 12, color: "var(--ink)" };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
        {([
          ["Valorisation retenue", current ? fmtM(current.amount ?? 0) : "—", current ? `exercice ${current.fiscalYear}` : "aucune validée"],
          ["Évolution", change == null ? "—" : `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)} %`, previous ? `vs exercice ${previous.fiscalYear}` : ""],
          ["Méthode retenue", current?.method ?? "—", ""],
          ["Arrêtée le", current?.validatedAt ? frDate(current.validatedAt.slice(0, 10)) : "—", "comité d'audit"],
        ] as [string, string, string][]).map(([k, v, sub]) => (
          <div key={k} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-2)" }}>{k}</div>
            <div className="serif tnum" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{v}</div>
            {sub && <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {validated.length >= 2 && (
        <div className="card" style={{ padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-2)", marginBottom: 8 }}>Trajectoire des valorisations arrêtées</div>
          <Spark points={validated} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          Valorisations <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— une par exercice, arrêtée en comité d&apos;audit</span>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setModal({ open: true, row: null })}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Proposer une valorisation
          </button>
        )}
      </div>

      {valuations.length === 0 ? (
        <div className="card" style={{ padding: "26px", textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>
          Aucune valorisation. Proposez-en une, elle deviendra le chiffre de référence une fois arrêtée en comité d&apos;audit.
        </div>
      ) : (
        <div className="card" style={{ padding: "6px 14px", overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={th}>Exercice</th>
                <th style={{ ...th, textAlign: "right" }}>Valorisation</th>
                <th style={th}>Méthode</th>
                <th style={th}>Date</th>
                <th style={th}>Statut</th>
                <th style={{ ...th, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {valuations.map((v) => {
                const isValidated = v.status === "Validée";
                return (
                  <tr key={v.id} style={{ borderTop: "1px solid var(--sep)" }}>
                    <td style={{ ...td, fontWeight: 600 }}>{v.fiscalYear ?? "—"}</td>
                    <td className="tnum serif" style={{ ...td, textAlign: "right", fontWeight: 600 }}>{fmtM(v.amount ?? 0)}</td>
                    <td style={{ ...td, color: "var(--text-2)" }}>{v.method ?? "—"}</td>
                    <td style={{ ...td, color: "var(--text-2)" }}>{frDate(v.flowDate)}</td>
                    <td style={td}>
                      <span className={`badge ${isValidated ? "badge-green" : "badge-amber"}`}>{isValidated ? "Arrêtée" : "Proposée"}</span>
                    </td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {canValidate && (
                        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} disabled={busy === v.id}
                          onClick={() => toggle(v, !isValidated)}>
                          {busy === v.id ? "…" : isValidated ? "Annuler l'arrêté" : "Arrêter"}
                        </button>
                      )}
                      {canEdit && !isValidated && (
                        <span className="row-actions" style={{ marginLeft: 6 }}>
                          <button onClick={() => setModal({ open: true, row: v })} aria-label="Modifier"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
                          <button onClick={() => remove(v)} aria-label="Supprimer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 10, lineHeight: 1.6 }}>
        Une valorisation <b>arrêtée</b> est le chiffre de référence de l&apos;exercice : elle alimente le multiple et la performance du fonds.
        Une seule peut être arrêtée par exercice ; les révisions antérieures restent visibles comme propositions.
        Seule la direction peut arrêter ou revenir sur un arrêté. La <b>performance</b> commerciale et financière se suit à un autre rythme, dans les onglets États financiers et KPIs.
      </div>

      {modal.open && <ValuationModal companyId={companyId} row={modal.row} taken={valuations} onClose={() => setModal({ open: false, row: null })} />}
    </div>
  );
}

function ValuationModal({ companyId, row, taken, onClose }: {
  companyId: string; row: FlowRow | null; taken: FlowRow[]; onClose: () => void;
}) {
  const router = useRouter();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(row?.fiscalYear ?? thisYear));
  const [amount, setAmount] = useState(row?.amount != null ? String(row.amount / 1_000_000) : "");
  const [method, setMethod] = useState(row?.method ?? VALUATION_METHODS[0]);
  const [date, setDate] = useState(row?.flowDate ?? new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(row?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prévenir avant d'écrire : une valorisation déjà arrêtée sur cet exercice bloquerait.
  const clash = taken.find((v) => v.id !== row?.id && v.fiscalYear === Number(year) && v.status === "Validée");

  async function save() {
    const value = amount.trim() === "" ? null : Math.round(Number(amount.replace(",", ".")) * 1_000_000);
    if (value == null || Number.isNaN(value)) { setError("Montant invalide."); return; }
    setBusy(true); setError(null);
    const payload = {
      company_id: companyId, type: "Valorisation", amount: value, method,
      flow_date: date || null, note: note.trim() || null,
      fiscal_year: Number(year), status: row?.status ?? "Proposée",
    };
    const supabase = createClient();
    const { error: err } = row
      ? await supabase.from("company_flows").update(payload).eq("id", row.id)
      : await supabase.from("company_flows").insert(payload);
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
    onClose();
  }

  return (
    <Modal title={row ? "Modifier la valorisation" : "Proposer une valorisation"} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "…" : "Enregistrer"}</button></>}>
      <div style={{ padding: "16px 20px", display: "grid", gap: 12 }}>
        <Field label="Exercice"><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></Field>
        <Field label="Valorisation (M FCFA)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex : 900" /></Field>
        <Field label="Méthode de valorisation">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {VALUATION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Date de l'évaluation"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Commentaire"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hypothèses retenues, comparables…" /></Field>
        {clash && (
          <div style={{ fontSize: 11.5, color: "var(--amber-fg)", background: "var(--amber-bg)", borderRadius: 8, padding: "8px 11px", lineHeight: 1.5 }}>
            L&apos;exercice {year} a déjà une valorisation <b>arrêtée</b> ({fmtM(clash.amount ?? 0)}). Celle-ci restera une proposition
            tant que l&apos;arrêté existant n&apos;aura pas été annulé.
          </div>
        )}
        {error && <div style={{ fontSize: 11.5, color: "var(--red-fg)" }}>{error}</div>}
      </div>
    </Modal>
  );
}
