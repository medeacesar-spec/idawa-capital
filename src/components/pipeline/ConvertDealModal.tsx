"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/form";
import type { DealDetail } from "@/lib/data/dealDetail";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ConvertDealModal({ deal, onClose }: { deal: DealDetail; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Étape de confirmation : on prévient que la conversion ARCHIVE le dossier (plus modifiable)
  // avant de lancer l'opération irréversible.
  const [confirming, setConfirming] = useState(false);
  const [investedDate, setInvestedDate] = useState(todayISO());
  const [amount, setAmount] = useState(String(deal.amount ?? ""));
  const [ownership, setOwnership] = useState(deal.ownershipTarget != null ? String(deal.ownershipTarget) : "");
  const [valuation, setValuation] = useState(deal.valuationPre != null ? String(deal.valuationPre) : "");
  const [country, setCountry] = useState("Bénin");

  async function submit() {
    setBusy(true); setError(null);
    const supabase = createClient();
    const { data, error: rpcErr } = await supabase.rpc("convert_deal_to_portfolio", {
      p_deal_id: deal.id,
      p_invested_date: investedDate || null,
      p_invested_amount: amount ? Number(amount) : null,
      p_ownership: ownership ? Number(ownership) : null,
      p_valuation: valuation ? Number(valuation) : null,
      p_country: country || null,
    });
    if (rpcErr) { setError(rpcErr.message); setBusy(false); return; }
    // Marque le dossier comme investi pour qu'il quitte le pipeline actif.
    await supabase.from("deals").update({ stage: "Investi" }).eq("id", deal.id);
    router.push(`/portefeuille/${data}`);
  }

  return (
    <Modal title={confirming ? "Confirmer la conversion" : "Convertir en participation"} onClose={onClose}
      footer={confirming ? (
        <>
          <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirming(false)}>Non, revenir</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Conversion…" : "Oui, convertir et archiver"}</button>
        </>
      ) : (
        <>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={() => { setError(null); setConfirming(true); }}>Continuer</button>
        </>
      )}>
      {confirming ? (
        <div>
          <div style={{ display: "flex", gap: 11, alignItems: "flex-start", background: "var(--amber-bg, var(--surface-cream))", border: "1px solid var(--border-strong)", borderRadius: 10, padding: "13px 15px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--espresso)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>
            <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
              Après la conversion, la fiche du dossier <b style={{ color: "var(--ink)" }}>{deal.companyName}</b> sera <b style={{ color: "var(--ink)" }}>archivée</b> : elle sera conservée telle quelle et <b style={{ color: "var(--ink)" }}>ne pourra plus être modifiée</b>. Tout le suivi se poursuivra sur la fiche de la participation.
              <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Voulez-vous continuer la conversion ?</div>
            </div>
          </div>
          {error && <div style={{ fontSize: 12.5, color: "var(--red-fg)", background: "var(--red-bg)", borderRadius: 8, padding: "9px 12px", marginTop: 12 }}>{error}</div>}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 14, background: "var(--surface-cream)", borderRadius: 8, padding: "10px 12px" }}>
            <b style={{ color: "var(--ink)" }}>{deal.companyName}</b> entre au portefeuille. <b>Tout l'historique est repris</b> (promoteur et évaluation, KPIs, ESG, notes, due diligence, contacts, documents, décisions de comité), et le <b>dossier d'origine reste archivé intact</b> — consultable via l'onglet <b>Origine / instruction</b>.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Date d'entrée"><Input type="date" value={investedDate} onChange={(e) => setInvestedDate(e.target.value)} /></Field>
            <Field label="Pays"><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Bénin" /></Field>
            <Field label="Montant investi (FCFA)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex : 200000000" /></Field>
            <Field label="Participation (%)"><Input type="number" value={ownership} onChange={(e) => setOwnership(e.target.value)} placeholder="Ex : 25" /></Field>
            <Field label="Valorisation d'entrée (FCFA)"><Input type="number" value={valuation} onChange={(e) => setValuation(e.target.value)} placeholder="Ex : 800000000" /></Field>
          </div>
        </>
      )}
    </Modal>
  );
}
