"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { VALUE_LEVERS, VALUE_STATUS } from "@/lib/ui-constants";
import type { ValueInitiative } from "@/lib/data/planning";
import type { FundUser } from "@/lib/data/users";
import { useCanEdit } from "./WriteAccess";
import { notifyAssignment } from "@/app/(app)/notify-actions";
import { logDueChange, todayISO } from "@/lib/suivi-log";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDate(d: string | null) { if (!d) return null; return `${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`; }
function isVcOverdue(it: { status: string; targetDate: string | null }) { return it.status !== "Réalisée" && it.status !== "En pause" && !!it.targetDate && it.targetDate < todayISO(); }
const STATUS_BADGE: Record<string, string> = { "Planifiée": "badge-neutral", "En cours": "badge-amber", "Réalisée": "badge-green", "En pause": "badge-red" };

type ContactOpt = { id: string; name: string };

export default function ValueCreationTab({ entityType, entityId, items, contacts, users }: { entityType: "deal" | "company"; entityId: string; items: ValueInitiative[]; contacts: ContactOpt[]; users: FundUser[] }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; item: ValueInitiative | null }>({ open: false, item: null });
  const done = items.filter((i) => i.status === "Réalisée").length;

  async function del(id: string) { if (!confirm("Supprimer cette initiative ?")) return; await createClient().from("value_creation").delete().eq("id", id); router.refresh(); }
  async function cycle(it: ValueInitiative) {
    const next = VALUE_STATUS[(VALUE_STATUS.indexOf(it.status) + 1) % VALUE_STATUS.length];
    await createClient().from("value_creation").update({ status: next }).eq("id", it.id); router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>Plan de création de valeur — <b style={{ color: "var(--ink)" }}>{done}/{items.length}</b> réalisées</div>
        {canEdit && (<button className="btn btn-primary" onClick={() => setModal({ open: true, item: null })}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Ajouter une initiative
        </button>)}
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucune initiative. Formalisez la stratégie de création de valeur (leviers de croissance, opérations, gouvernance, ESG…).</div>
      ) : (
        <div className="card" style={{ padding: "4px 18px" }}>
          {items.map((it, i) => (
            <div key={it.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
              <button onClick={() => cycle(it)} title="Changer le statut" style={{ border: "none", background: "none", cursor: "pointer", padding: 0, marginTop: 1 }}>
                <span className={`badge ${STATUS_BADGE[it.status] ?? "badge-neutral"}`} style={{ cursor: "pointer", minWidth: 74, textAlign: "center" }}>{it.status}</span>
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{it.initiative}</div>
                <div style={{ fontSize: 11, color: isVcOverdue(it) ? "var(--red-fg)" : "var(--text-3)", marginTop: 2 }}>
                  {it.lever ?? "—"}{it.owner ? ` · ${it.owner}` : ""}
                  {it.targetDate
                    ? ` · échéance ${frDate(it.targetDate)}${isVcOverdue(it) ? " · en retard" : ""}`
                    : <span style={{ color: "var(--red-fg)", fontWeight: 600 }}> · échéance à définir</span>}
                </div>
                {it.impact && <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 4, lineHeight: 1.5 }}>Impact visé : {it.impact}</div>}
              </div>
              <div className="row-actions" style={{ display: canEdit ? undefined : "none" }}>
                <button onClick={() => setModal({ open: true, item: it })} aria-label="Modifier"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
                <button onClick={() => del(it.id)} aria-label="Supprimer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && <VcModal entityType={entityType} entityId={entityId} item={modal.item} contacts={contacts} users={users} onClose={() => setModal({ open: false, item: null })} />}
    </div>
  );

  function VcModal({ entityType, entityId, item, contacts, users, onClose }: { entityType: "deal" | "company"; entityId: string; item: ValueInitiative | null; contacts: ContactOpt[]; users: FundUser[]; onClose: () => void }) {
    const [busy, setBusy] = useState(false);
    const [lever, setLever] = useState(item?.lever ?? VALUE_LEVERS[0]);
    const [initiative, setInitiative] = useState(item?.initiative ?? "");
    const [owner, setOwner] = useState(item?.owner ?? "");
    const [assigneeId, setAssigneeId] = useState(item?.assigneeId ?? "");
    const [status, setStatus] = useState(item?.status ?? VALUE_STATUS[0]);
    const [target, setTarget] = useState(item?.targetDate ?? "");
    const [impact, setImpact] = useState(item?.impact ?? "");
    const [dueReason, setDueReason] = useState("");
    const originalDue = item?.targetDate ?? null;
    const dueChanged = !!item && !!originalDue && !!target && target !== originalDue;
    const canSave = !!initiative.trim() && !!target && !(dueChanged && !dueReason.trim());
    async function save() {
      if (!canSave) return;
      setBusy(true);
      const supabase = createClient();
      const payload = { entity_type: entityType, entity_id: entityId, lever, initiative: initiative.trim(), owner: owner.trim() || null, assignee_id: assigneeId || null, status, target_date: target, impact: impact.trim() || null };
      if (item) {
        await supabase.from("value_creation").update(payload).eq("id", item.id);
        if (target !== originalDue) await logDueChange({ entityType, entityId, kind: "de l'initiative", label: initiative.trim(), oldDue: originalDue, newDue: target, reason: dueReason });
      } else {
        await supabase.from("value_creation").insert(payload);
      }
      // Prévenir la personne assignée — uniquement si l'affectation a CHANGÉ :
      // la rappeler à chaque retouche ferait ignorer tous les emails suivants.
      if (assigneeId && assigneeId !== (item?.assigneeId ?? "")) {
        await notifyAssignment({
          kind: "Initiative de création de valeur", title: initiative.trim(), assigneeId,
          dueDate: target || null, entityType, entityId,
        });
      }
      onClose(); router.refresh();
    }
    return (
      <Modal title={item ? "Modifier l'initiative" : "Ajouter une initiative"} onClose={onClose}
        footer={<><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={busy || !canSave} onClick={save}>{busy ? "…" : "Enregistrer"}</button></>}>
        <Field label="Initiative"><Input value={initiative} onChange={(e) => setInitiative(e.target.value)} placeholder="Ex : Ouvrir 2 nouvelles agences" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Levier"><Select value={lever} onChange={(e) => setLever(e.target.value)}>{VALUE_LEVERS.map((l) => <option key={l} value={l}>{l}</option>)}</Select></Field>
          <Field label="Statut"><Select value={status} onChange={(e) => setStatus(e.target.value)}>{VALUE_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Responsable">
            {contacts.length === 0 ? (
              <div style={{ fontSize: 11.5, color: "var(--text-3)", padding: "8px 0" }}>Ajoutez d'abord des contacts (onglet Contacts) pour désigner un responsable.</div>
            ) : (
              <Select value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">— Aucun —</option>
                {contacts.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                {owner && !contacts.some((c) => c.name === owner) && <option value={owner}>{owner}</option>}
              </Select>
            )}
          </Field>
          <Field label="Échéance (obligatoire)"><Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
        </div>
        {!target && <div style={{ fontSize: 11.5, color: "var(--red-fg)", margin: "-6px 0 4px" }}>Une échéance est requise : chaque initiative doit avoir une date cible.</div>}
        <Field label="Suivi par (équipe Idawa)" hint="Reçoit le rappel dans « À faire »"><Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}><option value="">— Personne —</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        <Field label="Impact visé"><Textarea rows={2} value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="Ex : +30% de CA, création de 15 emplois…" /></Field>
        {dueChanged && (
          <Field label="Motif du changement d'échéance">
            <Textarea rows={2} value={dueReason} onChange={(e) => setDueReason(e.target.value)} placeholder="Pourquoi l'échéance est-elle déplacée ? (consigné dans le journal du Suivi)" />
          </Field>
        )}
      </Modal>
    );
  }
}
