"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import type { SessionOptions } from "@/lib/data/committees";
import { createSession, updateSession } from "@/app/(app)/comites/actions";

export type SessionFormValues = { scope: string; committeeType: string; title: string; sessionDate: string | null; opinionDeadline: string };
type Scope = SessionOptions["scopes"][number];

/**
 * Création ou modification d'une séance. On choisit d'abord le fonds ou le programme : seuls ses
 * comités sont proposés (comités Idawa pour un fonds, comités configurés pour un programme).
 * La date limite des avis est obligatoire (règle des échéances).
 */
export default function SessionFormModal({ sessionId, initial, scopes, onClose }: {
  sessionId?: string; initial?: SessionFormValues; scopes: Scope[]; onClose: () => void;
}) {
  const router = useRouter();
  const first = scopes[0];
  const [f, setF] = useState<SessionFormValues>(initial ?? {
    scope: first ? `${first.kind}:${first.id}` : "", committeeType: first?.committees[0]?.name ?? "", title: "", sessionDate: "", opinionDeadline: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof SessionFormValues, v: string) => setF((p) => ({ ...p, [k]: v }));

  const scope = scopes.find((s) => `${s.kind}:${s.id}` === f.scope);
  const types = scope?.committees.map((c) => c.name) ?? [];

  function pickScope(v: string) {
    const s = scopes.find((x) => `${x.kind}:${x.id}` === v);
    const names = s?.committees.map((c) => c.name) ?? [];
    setF((p) => ({ ...p, scope: v, committeeType: names.includes(p.committeeType) ? p.committeeType : names[0] ?? "" }));
  }

  async function submit() {
    setBusy(true); setErr(null);
    const r = sessionId ? await updateSession(sessionId, f) : await createSession(f);
    setBusy(false);
    if ("error" in r && r.error) { setErr(r.error); return; }
    onClose();
    if (!sessionId && "id" in r) router.push(`/comites/${r.id}`); else router.refresh();
  }

  const funds = scopes.filter((s) => s.kind === "fund"), programs = scopes.filter((s) => s.kind === "program");

  return (
    <Modal title={sessionId ? "Modifier la séance" : "Nouvelle séance de comité"} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy || !f.title.trim() || !f.opinionDeadline || !f.committeeType} onClick={submit}>{busy ? "Enregistrement…" : sessionId ? "Enregistrer" : "Créer la séance"}</button>
      </>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Fonds ou programme">
          <Select value={f.scope} onChange={(e) => pickScope(e.target.value)}>
            {funds.length > 0 && <optgroup label="Fonds">{funds.map((s) => <option key={s.id} value={`fund:${s.id}`}>{s.name}</option>)}</optgroup>}
            {programs.length > 0 && <optgroup label="Programmes">{programs.map((s) => <option key={s.id} value={`program:${s.id}`}>{s.name}</option>)}</optgroup>}
          </Select>
        </Field>
        <Field label="Comité">
          <Select value={f.committeeType} onChange={(e) => set("committeeType", e.target.value)} disabled={!types.length}>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
      </div>
      {scope && !types.length && (
        <div style={{ fontSize: 11.5, color: "var(--red-fg, #A6412E)", margin: "-4px 0 8px" }}>
          Aucun comité n&apos;est configuré pour {scope.name} : ajoutez-les dans Paramètres du fonds → Programmes.
        </div>
      )}
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
