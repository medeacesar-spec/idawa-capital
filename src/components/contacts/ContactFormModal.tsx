"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import { CONTACT_FUNCTIONS, CONTACT_ORG_TYPES } from "@/lib/ui-constants";
import type { Contact } from "@/lib/data/contacts";

export default function ContactFormModal({ contact, link, onClose }: { contact: Contact | null; link?: { dealId?: string; companyId?: string }; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: contact?.name ?? "",
    function: contact?.function ?? "",
    organization: contact?.organization ?? "",
    orgType: contact?.orgType ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    if (!f.name.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const payload = { name: f.name.trim(), function: f.function || null, organization: f.organization || null, org_type: f.orgType || null, email: f.email || null, phone: f.phone || null };
    if (contact) await supabase.from("contacts").update(payload).eq("id", contact.id);
    else await supabase.from("contacts").insert({ ...payload, deal_id: link?.dealId ?? null, company_id: link?.companyId ?? null });
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal title={contact ? "Modifier le contact" : "Nouveau contact"} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy || !f.name.trim()} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </>}>
      <Field label="Nom"><Input value={f.name} autoFocus onChange={(e) => set("name", e.target.value)} placeholder="Ex : Aïcha Koffi" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Fonction">
          <Select value={f.function} onChange={(e) => set("function", e.target.value)}>
            <option value="">— Choisir —</option>
            {CONTACT_FUNCTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label="Type d'organisation">
          <Select value={f.orgType} onChange={(e) => set("orgType", e.target.value)}>
            <option value="">— Choisir —</option>
            {CONTACT_ORG_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Organisation"><Input value={f.organization} onChange={(e) => set("organization", e.target.value)} placeholder="Ex : PayNow" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="nom@exemple.com" /></Field>
        <Field label="Téléphone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+229 …" /></Field>
      </div>
    </Modal>
  );
}
