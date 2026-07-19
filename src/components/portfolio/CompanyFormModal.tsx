"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import { EHS_SECTORS, ehsSectorsForFamilies } from "@/lib/ui-constants";
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
    ehsSector: company?.ehsSector ?? "",
    investedDate: company?.investedDate ?? "",
    invested: company ? String(company.invested / M) : "",
    valuation: company ? String(company.valuation / M) : "",
    tvpi: company?.tvpi != null ? String(company.tvpi) : "",
    tri: company?.tri != null ? String(company.tri) : "",
    ownership: company?.ownership != null ? String(company.ownership) : "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const isEquity = f.trackingType === "equity";
  // Passer en capital alors qu'un programme d'accélération était choisi laisserait la
  // fiche dans un état contradictoire : on détache plutôt que d'enregistrer l'incohérence.
  const selected = programs.find((p) => p.id === f.programId);
  const programMismatch = isEquity && !!selected && selected.nature !== "invest" && selected.nature !== "mixte";
  const isClosed = f.status === "Sorti" || f.status === "Radié";
  const ehsFamilies = programs.find((p) => p.id === f.programId)?.ehsFamilies ?? [];

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
      ehs_sector: f.ehsSector || null,
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
        <button className="btn btn-primary" disabled={busy || !f.name.trim() || programMismatch} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
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
        <Field label="Programme"
          hint={isEquity ? "Une entreprise en capital relève d'un programme qui investit" : undefined}>
          <Select value={f.programId} onChange={(e) => set("programId", e.target.value)}>
            <option value="">— Aucun —</option>
            {/* Proposer un programme d'accélération à une participation ferait afficher
                celle-ci comme une simple accompagnée, alors que le fonds détient des parts. */}
            {programs
              .filter((p) => !isEquity || p.nature === "invest" || p.nature === "mixte" || p.id === f.programId)
              .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      </div>
      {programMismatch && (
        <div style={{ fontSize: 11.5, color: "var(--amber-fg)", background: "var(--amber-bg)", borderRadius: 8, padding: "8px 11px", lineHeight: 1.5 }}>
          <b>{selected?.name}</b> est un programme d&apos;accélération : il ne peut pas porter une participation en capital.
          Choisissez un programme qui investit, ou passez le suivi en accélération.
        </div>
      )}
      <Field label="Secteur">
        <Select value={f.subSectorId} onChange={(e) => set("subSectorId", e.target.value)}>
          <option value="">— Choisir un sous-secteur —</option>
          {subSectors.map((s) => <option key={s.id} value={s.id}>{s.industry} — {s.name}</option>)}
        </Select>
      </Field>
      <Field label="Secteur EHS (IFC)"
        hint={ehsFamilies.length
          ? `Familles du programme : ${ehsFamilies.join(" · ")} — l'entreprise peut relever d'une autre famille`
          : "Secteur précis de l'entreprise"}>
        <Select value={f.ehsSector} onChange={(e) => set("ehsSector", e.target.value)}>
          <option value="">— Non défini —</option>
          {ehsSectorsForFamilies(ehsFamilies).map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((s) => <option key={s} value={s}>{s}</option>)}
            </optgroup>
          ))}
          {!!f.ehsSector && !EHS_SECTORS.some((g) => g.items.includes(f.ehsSector)) && (
            <option value={f.ehsSector}>{f.ehsSector}</option>
          )}
        </Select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Statut">
          {isClosed ? (
            <div style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 9, background: "var(--surface-cream)", fontSize: 12.5 }}>
              <span className="badge" style={{ background: "var(--red-bg)", color: "var(--red-fg)", marginRight: 6 }}>{f.status}</span>
              <span style={{ color: "var(--text-3)", fontSize: 11 }}>décision de comité — voir l'onglet « Décisions »</span>
            </div>
          ) : (
            <Select value={f.status} onChange={(e) => set("status", e.target.value)}>
              {["Actif", "En difficulté"].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Date d'entrée"><Input type="date" value={f.investedDate} onChange={(e) => set("investedDate", e.target.value)} /></Field>
      </div>
      {isEquity && (
        <>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", margin: "6px 0 10px", paddingTop: 8, borderTop: "1px solid var(--sep)" }}>Données financières</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Investi (M FCFA)"><Input type="number" value={f.invested} onChange={(e) => set("invested", e.target.value)} placeholder="250" /></Field>
            <Field label="Valorisation actuelle (M FCFA)"><Input type="number" value={f.valuation} onChange={(e) => set("valuation", e.target.value)} placeholder="390" /></Field>
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
