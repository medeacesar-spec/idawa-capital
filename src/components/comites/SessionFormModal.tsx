"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import { COMMITTEE_TYPES } from "@/lib/ui-constants";
import { createSession, updateSession } from "@/app/(app)/comites/actions";

export type SessionFormValues = { committeeType: string; title: string; sessionDate: string | null; opinionDeadline: string };

/** Création ou modification d'une séance. La date limite des avis est obligatoire (règle des échéances). */
export default function SessionFormModal({ sessionId, initial, programCommittees, onClose }: {
  sessionId?: string; initial?: SessionFormValues; programCommittees: string[]; onClose: () => void;
}) {
  const router = useRouter();
  const types = Array.from(new Set([...COMMITTEE_TYPES, ...programCommittees, ...(initial ? [initial.committeeType] : [])]));
  const [f, setF] = useState<SessionFormValues>(initial ?? { committeeType: "Comité d'investissement", title: "", sessionDate: "", opinionDeadline: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof SessionFormValues, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    setBusy(true); setErr(null);
    const r = sessionId ? await updateSession(sessionId, f) : await createSession(f);
    setBusy(false);
    if ("error" in r && r.error) { setErr(r.error); return; }
    onClose();
    if (!sessionId && "id" in r) router.push(`/comites/${r.id}`); else router.refresh();
  }

  return (
    <Modal title={sessionId ? "Modifier la séance" : "Nouvelle séance de comité"} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy || !f.title.trim() || !f.opinionDeadline} onClick={submit}>{busy ? "Enregistrement…" : sessionId ? "Enregistrer" : "Créer la séance"}</button>
      </>}>
      <Field label="Type de comité">
        <Select value={f.committeeType} onChange={(e) => set("committeeType", e.target.value)}>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Intitulé"><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex : CI du 20 octobre 2026" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date de séance"><Input type="date" value={f.sessionDate ?? ""} onChange={(e) => set("sessionDate", e.target.value)} /></Field>
        <Field label="Avis attendus avant le *"><Input type="date" value={f.opinionDeadline} onChange={(e) => set("opinionDeadline", e.target.value)} /></Field>
      </div>
      {!f.opinionDeadline && <div style={{ fontSize: 11.5, color: "var(--red-fg, #A6412E)" }}>La date limite des avis est obligatoire.</div>}
      {err && <div style={{ fontSize: 12, color: "var(--red-fg, #A6412E)", marginTop: 6 }}>{err}</div>}
    </Modal>
  );
}
