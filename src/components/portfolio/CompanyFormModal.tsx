"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import { PORTFOLIO_STATUS } from "@/lib/ui-constants";
import type { PortfolioCompany, PortfolioProgram, SubSectorOption } from "@/lib/data/portfolio";

const M = 1_000_000;

export default function CompanyFormModal({
  company, programs, subSectors, onClose,
}: {
  company: PortfolioCompany | null;
  programs: PortfolioProgram[];
  subSectors: SubSectorOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: company?.name ?? "",
    trackingType: company?.trackingType ?? "equity",
    subSectorId: company?.subSectorId ?? "",
    programId: company?.programId ?? "",
    status: company?.status ?? "Actif",
    investedDate: company?.investedDate ?? "",
    invested: company ? String(company.invested / M) : "",
    valuation: company ? String(company.valuation / M) : "",
    tvpi: company?.tvpi != null ? String(company.tvpi) : "",
    tri: company?.tri != null ? String(company.tri) : "",
    ownership: company?.ownership != null ? String(company.ownership) : "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const isEquity = f.trackingType === "equity";

  async function submit() {
    if (!f.name.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const num = (s: string) => (s === "" ? null : Number(s));
    const payload: Record<string, unknown> = {
      name: f.name.trim(),
      tracking_type: f.trackingType,
      primary_sub_sector_id: f.subSectorId || null,
      program_id: f.programId || null,
      status: f.status,
      invested_date: f.investedDate || null,
      invested_amount: isEquity ? (num(f.invested) ?? 0) * M : 0,
      current_valuation: isEquity ? (num(f.valuation) ?? 0) * M : 0,
      tvpi: isEquity ? num(f.tvpi) : null,
      tri: isEquity ? num(f.tri) : null,
      ownership_pct: isEquity ? num(f.ownership) : null,
    };
    if (company) await supabase.from("portfolio_companies").update(payload).eq("id", company.id);
    else await supabase.from("portfolio_companies").insert(payload);
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title={company ? "Modifier l'entreprise" : "Nouvelle entreprise"}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy || !f.name.trim()} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </>}
    >
      <Field label="Nom de l'entreprise"><Input value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="Ex : PayNow" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type de suivi">
          <Select value={f.trackingType} onChange={(e) => set("trackingType", e.target.value)}>
            <option value="equity">Participation (equity)</option>
            <option value="accompagnement">Accélération</option>
          </Select>
        </Field>
        <Field label="Programme">
          <Select value={f.programId} onChange={(e) => set("programId", e.target.value)}>
            <option value="">— Aucun —</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Secteur">
        <Select value={f.subSectorId} onChange={(e) => set("subSectorId", e.target.value)}>
          <option value="">— Choisir un sous-secteur —</option>
          {subSectors.map((s) => <option key={s.id} value={s.id}>{s.industry} — {s.name}</option>)}
        </Select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Statut">
          <Select value={f.status} onChange={(e) => set("status", e.target.value)}>
            {PORTFOLIO_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Date d'entrée"><Input type="date" value={f.investedDate} onChange={(e) => set("investedDate", e.target.value)} /></Field>
      </div>
      {isEquity && (
        <>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", margin: "6px 0 10px", paddingTop: 8, borderTop: "1px solid var(--sep)" }}>Données financières</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Investi (M FCFA)"><Input type="number" value={f.invested} onChange={(e) => set("invested", e.target.value)} placeholder="250" /></Field>
            <Field label="Valeur actuelle (M FCFA)"><Input type="number" value={f.valuation} onChange={(e) => set("valuation", e.target.value)} placeholder="390" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Multiple (TVPI)"><Input type="number" step="0.01" value={f.tvpi} onChange={(e) => set("tvpi", e.target.value)} placeholder="1.56" /></Field>
            <Field label="TRI (%)"><Input type="number" value={f.tri} onChange={(e) => set("tri", e.target.value)} placeholder="20" /></Field>
            <Field label="Participation (%)"><Input type="number" value={f.ownership} onChange={(e) => set("ownership", e.target.value)} placeholder="15" /></Field>
          </div>
        </>
      )}
    </Modal>
  );
}
