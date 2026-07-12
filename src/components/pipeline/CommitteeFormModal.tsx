"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { COMMITTEE_TYPES, COMMITTEE_DECISIONS, COMMITTEE_OUTCOME_NONE } from "@/lib/ui-constants";

type PassageInput = {
  id: string;
  committeeType: string;
  sessionDate: string | null;
  decision: string | null;
  participants: string | null;
  conditions: string | null;
  outcome: string | null;
};

export default function CommitteeFormModal({
  dealId, companyId, outcomes = [], defaultType, passage, onClose,
}: {
  dealId?: string;
  companyId?: string;
  outcomes?: string[];
  defaultType?: string;
  passage: PassageInput | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    committeeType: passage?.committeeType ?? defaultType ?? COMMITTEE_TYPES[0],
    sessionDate: passage?.sessionDate ?? "",
    decision: passage?.decision ?? COMMITTEE_DECISIONS[0],
    participants: passage?.participants ?? "",
    conditions: passage?.conditions ?? "",
    outcome: passage?.outcome ?? (outcomes.length ? COMMITTEE_OUTCOME_NONE : ""),
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    setBusy(true);
    const supabase = createClient();
    const outcomeVal = outcomes.length && f.outcome !== COMMITTEE_OUTCOME_NONE ? f.outcome : null;
    const payload = {
      committee_type: f.committeeType,
      session_date: f.sessionDate || null,
      decision: f.decision,
      participants: f.participants || null,
      conditions: f.conditions || null,
      outcome: outcomeVal,
    };
    if (passage) await supabase.from("committee_passages").update(payload).eq("id", passage.id);
    else await supabase.from("committee_passages").insert({ ...payload, deal_id: dealId ?? null, company_id: companyId ?? null });
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal title={passage ? "Modifier la décision de comité" : "Enregistrer une décision de comité"} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type de comité">
          <Select value={f.committeeType} onChange={(e) => set("committeeType", e.target.value)}>
            {COMMITTEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Date de séance"><Input type="date" value={f.sessionDate} onChange={(e) => set("sessionDate", e.target.value)} /></Field>
      </div>
      {outcomes.length > 0 && (
        <Field label="Nature de la décision">
          <Select value={f.outcome} onChange={(e) => set("outcome", e.target.value)}>
            {[COMMITTEE_OUTCOME_NONE, ...outcomes].map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5, lineHeight: 1.5 }}>
            Une décision structurante (hors « suivi ») ne prend effet qu'après validation par la Direction.
          </div>
        </Field>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Décision">
          <Select value={f.decision} onChange={(e) => set("decision", e.target.value)}>
            {COMMITTEE_DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Participants"><Input value={f.participants} onChange={(e) => set("participants", e.target.value)} placeholder="Ex : 5 membres" /></Field>
      </div>
      <Field label="Conditions / compte-rendu"><Textarea value={f.conditions} onChange={(e) => set("conditions", e.target.value)} placeholder="Décision, conditions posées, points clés…" /></Field>
    </Modal>
  );
}
