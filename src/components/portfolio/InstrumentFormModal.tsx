"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { INSTRUMENT_TYPES, INSTRUMENT_PERIODICITY, VALUATION_METHODS } from "@/lib/ui-constants";
import type { Instrument } from "@/lib/data/instruments";

const M = 1_000_000;
const kindOf = (type: string) => INSTRUMENT_TYPES.find((t) => t.key === type)?.kind ?? "debt";

export default function InstrumentFormModal({ companyId, instrument, onClose }: { companyId: string; instrument: Instrument | null; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    type: instrument?.type ?? "equity",
    label: instrument?.label ?? "",
    grantDate: instrument?.grantDate ?? "",
    committed: instrument?.amountCommitted != null ? String(instrument.amountCommitted / M) : "",
    disbursed: instrument?.amountDisbursed != null ? String(instrument.amountDisbursed / M) : "",
    ownership: instrument?.ownershipPct != null ? String(instrument.ownershipPct) : "",
    valuationMethod: instrument?.valuationMethod ?? "",
    valuation: instrument?.valuation != null ? String(instrument.valuation / M) : "",
    interestRate: instrument?.interestRate != null ? String(instrument.interestRate) : "",
    variableRate: instrument?.variableRate != null ? String(instrument.variableRate) : "",
    rateCap: instrument?.rateCap != null ? String(instrument.rateCap) : "",
    graceMonths: instrument?.graceMonths != null ? String(instrument.graceMonths) : "",
    durationMonths: instrument?.durationMonths != null ? String(instrument.durationMonths) : "",
    periodicity: instrument?.periodicity ?? "trimestrielle",
    firstDueDate: instrument?.firstDueDate ?? "",
    notes: instrument?.notes ?? "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const isEquity = kindOf(f.type) === "equity";
  const n = (s: string) => (s.trim() === "" ? null : Number(s));

  async function submit() {
    setBusy(true);
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      company_id: companyId,
      type: f.type,
      label: f.label.trim() || null,
      grant_date: f.grantDate || null,
      amount_committed: n(f.committed) != null ? (n(f.committed) as number) * M : null,
      amount_disbursed: n(f.disbursed) != null ? (n(f.disbursed) as number) * M : null,
      ownership_pct: isEquity ? n(f.ownership) : null,
      valuation_method: isEquity ? (f.valuationMethod || null) : null,
      valuation: isEquity && n(f.valuation) != null ? (n(f.valuation) as number) * M : null,
      interest_rate: !isEquity ? n(f.interestRate) : null,
      variable_rate: !isEquity ? n(f.variableRate) : null,
      rate_cap: !isEquity ? n(f.rateCap) : null,
      grace_months: !isEquity ? n(f.graceMonths) : null,
      duration_months: !isEquity ? n(f.durationMonths) : null,
      periodicity: !isEquity ? f.periodicity : null,
      first_due_date: !isEquity ? (f.firstDueDate || null) : null,
      notes: f.notes.trim() || null,
    };
    if (instrument) await supabase.from("financing_instruments").update(payload).eq("id", instrument.id);
    else await supabase.from("financing_instruments").insert(payload);
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal title={instrument ? "Modifier l'instrument" : "Ajouter un instrument"} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type d'instrument">
          <Select value={f.type} onChange={(e) => set("type", e.target.value)}>
            {INSTRUMENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Intitulé"><Input value={f.label} onChange={(e) => set("label", e.target.value)} placeholder={isEquity ? "Ex : Prise de participation 2024" : "Ex : Prêt d'actionnaire 2024"} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Date d'octroi"><Input type="date" value={f.grantDate} onChange={(e) => set("grantDate", e.target.value)} /></Field>
        <Field label="Engagé (M FCFA)"><Input type="number" value={f.committed} onChange={(e) => set("committed", e.target.value)} placeholder="200" /></Field>
        <Field label="Décaissé (M FCFA)"><Input type="number" value={f.disbursed} onChange={(e) => set("disbursed", e.target.value)} placeholder="200" /></Field>
      </div>

      {isEquity ? (
        <>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", margin: "6px 0 8px", paddingTop: 8, borderTop: "1px solid var(--sep)" }}>Capital</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Participation (%)"><Input type="number" value={f.ownership} onChange={(e) => set("ownership", e.target.value)} placeholder="25" /></Field>
            <Field label="Valorisation à date (M FCFA)"><Input type="number" value={f.valuation} onChange={(e) => set("valuation", e.target.value)} placeholder="300" /></Field>
            <Field label="Méthode de valo">
              <Select value={f.valuationMethod} onChange={(e) => set("valuationMethod", e.target.value)}>
                <option value="">— Méthode —</option>
                {VALUATION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", margin: "6px 0 8px", paddingTop: 8, borderTop: "1px solid var(--sep)" }}>Conditions du prêt</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Taux annuel (%)"><Input type="number" value={f.interestRate} onChange={(e) => set("interestRate", e.target.value)} placeholder="8" /></Field>
            <Field label="Part variable (%)"><Input type="number" value={f.variableRate} onChange={(e) => set("variableRate", e.target.value)} placeholder="4" /></Field>
            <Field label="Taux plafond (%)"><Input type="number" value={f.rateCap} onChange={(e) => set("rateCap", e.target.value)} placeholder="22" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <Field label="Différé (mois)"><Input type="number" value={f.graceMonths} onChange={(e) => set("graceMonths", e.target.value)} placeholder="12" /></Field>
            <Field label="Durée (mois)"><Input type="number" value={f.durationMonths} onChange={(e) => set("durationMonths", e.target.value)} placeholder="60" /></Field>
            <Field label="Périodicité">
              <Select value={f.periodicity} onChange={(e) => set("periodicity", e.target.value)}>
                {INSTRUMENT_PERIODICITY.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="1ʳᵉ échéance"><Input type="date" value={f.firstDueDate} onChange={(e) => set("firstDueDate", e.target.value)} /></Field>
          </div>
        </>
      )}
      <Field label="Notes"><Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Précisions sur l'instrument…" /></Field>
    </Modal>
  );
}
