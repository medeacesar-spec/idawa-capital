"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import { DEAL_FUNNEL_STAGES, DEAL_SOURCES, isAdvancedStage } from "@/lib/ui-constants";
import type { PipelineDeal, PipelineProgram, PipelineSubSector, PipelineMember } from "@/lib/data/pipeline";

const M = 1_000_000;

// Ce que chaque étape signifie, pour que le choix ne soit pas à deviner.
const STAGE_HINT: Record<string, string> = {
  "Sourcing": "Premier contact, avant toute analyse.",
  "Analyse": "Étude préliminaire de l'opportunité.",
  "Pipeline avancé": "Dossier réellement engagé — automatique après le comité d'ouverture.",
  "Due Diligence": "Vérifications approfondies.",
  "Négociation": "Termes de l'investissement en discussion.",
  "Closing": "Finalisation, avant conversion en participation.",
};

export default function DealFormModal({
  deal, programs, subSectors, members, onClose,
}: {
  deal: PipelineDeal | null;
  programs: PipelineProgram[];
  subSectors: PipelineSubSector[];
  members: PipelineMember[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    companyName: deal?.companyName ?? "",
    subSectorId: deal?.subSectorId ?? "",
    programId: deal?.programId ?? "",
    stage: deal?.stage ?? "Sourcing",
    amount: deal ? String(deal.amount / M) : "",
    probability: deal?.probability != null ? String(deal.probability) : "",
    officerId: deal?.officerId ?? "",
    analystId: deal?.analystId ?? "",
    expectedClose: deal?.expectedClose ?? "",
    dealSource: deal?.source ?? "",
    dealSourceDetail: deal?.sourceDetail ?? "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [advanced, setAdvanced] = useState(!!deal?.expectedClose);

  async function submit() {
    if (!f.companyName.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      company_name: f.companyName.trim(),
      primary_sub_sector_id: f.subSectorId || null,
      program_id: f.programId || null,
      stage: f.stage,
      amount: (f.amount === "" ? 0 : Number(f.amount)) * M,
      probability: f.probability === "" ? null : Number(f.probability),
      investment_officer_id: f.officerId || null,
      analyst_id: f.analystId || null,
      expected_close: f.expectedClose || null,
      deal_source: f.dealSource || null,
      deal_source_detail: f.dealSourceDetail.trim() || null,
    };
    if (deal) await supabase.from("deals").update(payload).eq("id", deal.id);
    else await supabase.from("deals").insert(payload);
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal
      title={deal ? "Modifier le dossier" : "Nouveau dossier"}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy || !f.companyName.trim()} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </>}
    >
      <Field label="Nom de la société"><Input value={f.companyName} autoFocus onChange={(e) => set("companyName", e.target.value)} placeholder="Ex : KweeziPay" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Étape">
          <Select value={f.stage} onChange={(e) => set("stage", e.target.value)}>
            {DEAL_FUNNEL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, lineHeight: 1.5 }}>
            {STAGE_HINT[f.stage] ?? ""}
            {isAdvancedStage(f.stage) && <span style={{ color: "var(--camel)" }}> ESG et création de valeur s&apos;activent.</span>}
          </div>
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
        <Field label="Montant (M FCFA)"><Input type="number" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="200" /></Field>
        <Field label="Probabilité (%)"><Input type="number" value={f.probability} onChange={(e) => set("probability", e.target.value)} placeholder="70" /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Source d'entrée">
          <Select value={f.dealSource} onChange={(e) => set("dealSource", e.target.value)}>
            <option value="">— À préciser —</option>
            {DEAL_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Précision / nom"><Input value={f.dealSourceDetail} onChange={(e) => set("dealSourceDetail", e.target.value)} placeholder="Ex : Etrilabs" /></Field>
      </div>
      <div style={{ margin: "2px 0 10px" }}>
        <button type="button" onClick={() => setAdvanced((a) => !a)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "var(--camel)" }}>
          {advanced ? "− Masquer les champs avancés" : "+ Champs avancés"}
        </button>
        {advanced && (
          <div style={{ marginTop: 10 }}>
            <Field label="Closing prévu (indicatif)"><Input type="date" value={f.expectedClose} onChange={(e) => set("expectedClose", e.target.value)} /></Field>
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Chargé d'investissement">
          <Select value={f.officerId} onChange={(e) => set("officerId", e.target.value)}>
            <option value="">— Non assigné —</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
        <Field label="Analyste">
          <Select value={f.analystId} onChange={(e) => set("analystId", e.target.value)}>
            <option value="">— Non assigné —</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
