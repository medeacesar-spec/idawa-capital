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
    <Modal title="Convertir en participation" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Conversion…" : "Convertir en participation"}</button>
      </>}>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 14, background: "var(--surface-cream)", borderRadius: 8, padding: "10px 12px" }}>
        <b style={{ color: "var(--ink)" }}>{deal.companyName}</b> entre au portefeuille. <b>Tout le dossier suit</b> : promoteur et évaluation, notes du Suivi, KPIs, ESG, contacts, documents, <b>due diligence</b> (onglet Origine / instruction) et <b>décisions de comité</b> (onglet Décisions). Le dossier reste consultable en historique.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date d'entrée"><Input type="date" value={investedDate} onChange={(e) => setInvestedDate(e.target.value)} /></Field>
        <Field label="Pays"><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Bénin" /></Field>
        <Field label="Montant investi (FCFA)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex : 200000000" /></Field>
        <Field label="Participation (%)"><Input type="number" value={ownership} onChange={(e) => setOwnership(e.target.value)} placeholder="Ex : 25" /></Field>
        <Field label="Valorisation d'entrée (FCFA)"><Input type="number" value={valuation} onChange={(e) => setValuation(e.target.value)} placeholder="Ex : 800000000" /></Field>
      </div>
      {error && <div style={{ fontSize: 12.5, color: "var(--red-fg)", background: "var(--red-bg)", borderRadius: 8, padding: "9px 12px", marginTop: 12 }}>{error}</div>}
    </Modal>
  );
}
