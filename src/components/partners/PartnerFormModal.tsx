"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import { RELATION_TYPES, PARTNER_STATUS } from "@/lib/ui-constants";
import type { Partner, PartnerProgram } from "@/lib/data/partners";

const M = 1_000_000;

export default function PartnerFormModal({ partner, programs, onClose }: { partner: Partner | null; programs: PartnerProgram[]; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: partner?.name ?? "",
    relationType: partner?.relationType ?? RELATION_TYPES[0],
    programId: partner?.programId ?? "",
    status: partner?.status ?? "En discussion",
    committed: partner ? String(partner.committed / M) : "",
    discussion: partner ? String(partner.discussion / M) : "",
    called: partner && partner.called ? String(partner.called / M) : "",
    distributed: partner && partner.distributed ? String(partner.distributed / M) : "",
    website: partner?.website ?? "",
    linkedin: partner?.linkedin ?? "",
    contactName: partner?.contactName ?? "",
    contactEmail: partner?.contactEmail ?? "",
    contactPhone: partner?.contactPhone ?? "",
  });
  const isLP = f.relationType === "Investisseur fonds";
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!f.name.trim()) return;
    setBusy(true);
    const supabase = createClient();
    let fundId: string | null = null;
    if (!f.programId) { const { data } = await supabase.from("funds").select("id").limit(1).single(); fundId = data?.id ?? null; }
    const payload = {
      name: f.name.trim(), relation_type: f.relationType,
      program_id: f.programId || null, fund_id: f.programId ? null : fundId,
      status: f.status,
      amount_committed: (f.committed === "" ? 0 : Number(f.committed)) * M,
      amount_discussion: (f.discussion === "" ? 0 : Number(f.discussion)) * M,
      amount_called: (f.called === "" ? 0 : Number(f.called)) * M,
      amount_distributed: (f.distributed === "" ? 0 : Number(f.distributed)) * M,
      website: f.website || null, linkedin: f.linkedin || null,
      contact_name: f.contactName || null, contact_email: f.contactEmail || null, contact_phone: f.contactPhone || null,
    };
    if (partner) await supabase.from("partners").update(payload).eq("id", partner.id);
    else await supabase.from("partners").insert(payload);
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal title={partner ? "Modifier le partenaire" : "Nouveau partenaire"} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy || !f.name.trim()} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </>}>
      <Field label="Nom"><Input value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="Ex : Enabel" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type de relation">
          <Select value={f.relationType} onChange={(e) => set("relationType", e.target.value)}>
            {RELATION_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="Statut">
          <Select value={f.status} onChange={(e) => set("status", e.target.value)}>
            {PARTNER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Rattachement">
        <Select value={f.programId} onChange={(e) => set("programId", e.target.value)}>
          <option value="">Fonds (global)</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Montant engagé (M FCFA)"><Input type="number" value={f.committed} onChange={(e) => set("committed", e.target.value)} placeholder="80" /></Field>
        <Field label="En discussion (M FCFA)"><Input type="number" value={f.discussion} onChange={(e) => set("discussion", e.target.value)} placeholder="0" /></Field>
      </div>

      {isLP && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Appelé (M FCFA)" hint="Capital déjà appelé auprès du LP"><Input type="number" value={f.called} onChange={(e) => set("called", e.target.value)} placeholder="0" /></Field>
          <Field label="Distribué (M FCFA)" hint="Distributions déjà versées au LP"><Input type="number" value={f.distributed} onChange={(e) => set("distributed", e.target.value)} placeholder="0" /></Field>
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--camel)", margin: "6px 0 -2px" }}>Interlocuteur &amp; web</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Contact"><Input value={f.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Ex : Jean Bio" /></Field>
        <Field label="Email"><Input type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="contact@…" /></Field>
        <Field label="Téléphone"><Input value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="+229 …" /></Field>
        <Field label="Site web"><Input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="exemple.org" /></Field>
        <Field label="LinkedIn"><Input value={f.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="linkedin.com/company/…" /></Field>
      </div>
    </Modal>
  );
}
