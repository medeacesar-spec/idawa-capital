"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { NOTE_TYPES, TASK_STATUS } from "@/lib/ui-constants";
import type { SuiviNote, SuiviTask } from "@/lib/data/suivi";
import type { FundUser } from "@/lib/data/users";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDate(d: string | null) { if (!d) return "—"; const dd = d.slice(8, 10); return `${dd} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`; }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
const STATUS_BADGE: Record<string, string> = { "À faire": "badge-neutral", "En cours": "badge-amber", "Fait": "badge-green" };
const TYPE_ICON: Record<string, string> = { Réunion: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75", Appel: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.35a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.75.34 1.54.57 2.35.7A2 2 0 0 1 22 16.92z", Email: "M4 4h16v16H4z M22 6l-10 7L2 6", Note: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" };

export default function SuiviTab({ entityType, entityId, notes, tasks, users }: { entityType: "deal" | "company"; entityId: string; notes: SuiviNote[]; tasks: SuiviTask[]; users: FundUser[] }) {
  const router = useRouter();
  const [noteModal, setNoteModal] = useState<{ open: boolean; note: SuiviNote | null }>({ open: false, note: null });
  const [taskModal, setTaskModal] = useState<{ open: boolean; task: SuiviTask | null }>({ open: false, task: null });

  async function delNote(id: string) {
    if (!confirm("Supprimer cette note ?")) return;
    await createClient().from("notes").delete().eq("id", id); router.refresh();
  }
  async function delTask(id: string) {
    if (!confirm("Supprimer cette action ?")) return;
    await createClient().from("tasks").delete().eq("id", id); router.refresh();
  }
  async function cycleStatus(t: SuiviTask) {
    const i = TASK_STATUS.indexOf(t.status ?? "À faire");
    const next = TASK_STATUS[(i + 1) % TASK_STATUS.length];
    await createClient().from("tasks").update({ status: next }).eq("id", t.id); router.refresh();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
      {/* Actions */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Actions de suivi <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— à faire, avec responsable et échéance</span></div>
          <button className="btn btn-primary" onClick={() => setTaskModal({ open: true, task: null })}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Ajouter une action
          </button>
        </div>
        {tasks.length === 0 ? (
          <div className="card" style={{ padding: "22px", textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>Aucune action. Cliquez « Ajouter une action ».</div>
        ) : (
          <div className="card" style={{ padding: "4px 18px" }}>
            {tasks.map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
                <button onClick={() => cycleStatus(t)} title="Changer le statut" style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                  <span className={`badge ${STATUS_BADGE[t.status ?? "À faire"] ?? "badge-neutral"}`} style={{ cursor: "pointer" }}>{t.status ?? "À faire"}</span>
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", textDecoration: t.status === "Fait" ? "line-through" : "none", opacity: t.status === "Fait" ? 0.6 : 1 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t.assigneeLabel ? t.assigneeLabel : "Non assignée"}{t.dueDate ? ` · échéance ${frDate(t.dueDate)}` : t.createdAt ? ` · ajoutée le ${frDate(t.createdAt)}` : ""}</div>
                </div>
                <div className="row-actions">
                  <button onClick={() => setTaskModal({ open: true, task: t })} aria-label="Modifier"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
                  <button onClick={() => delTask(t.id)} aria-label="Supprimer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notes / journal */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Journal <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— réunions, appels, échanges</span></div>
          <button className="btn btn-ghost" onClick={() => setNoteModal({ open: true, note: null })}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Ajouter une note
          </button>
        </div>
        {notes.length === 0 ? (
          <div className="card" style={{ padding: "22px", textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>Aucune note. Consignez ici vos réunions et échanges.</div>
        ) : (
          <div className="card" style={{ padding: "16px 20px", display: "grid", gap: 14 }}>
            {notes.map((n, i) => (
              <div key={n.id} style={{ display: "flex", gap: 12, borderTop: i === 0 ? "none" : "1px solid var(--sep)", paddingTop: i === 0 ? 0 : 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-cream)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--camel)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={TYPE_ICON[n.type ?? "Note"] ?? TYPE_ICON.Note} /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{n.type ?? "Note"}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{frDate(n.noteDate)}{n.participants ? ` · ${n.participants}` : ""}</span>
                    <span className="row-actions" style={{ marginLeft: "auto" }}>
                      <button onClick={() => setNoteModal({ open: true, note: n })} aria-label="Modifier"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
                      <button onClick={() => delNote(n.id)} aria-label="Supprimer"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
                    </span>
                  </div>
                  {n.summary && <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.55, marginTop: 3 }}>{n.summary}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {noteModal.open && <NoteModal entityType={entityType} entityId={entityId} note={noteModal.note} onClose={() => setNoteModal({ open: false, note: null })} />}
      {taskModal.open && <TaskModal entityType={entityType} entityId={entityId} task={taskModal.task} users={users} onClose={() => setTaskModal({ open: false, task: null })} />}
    </div>
  );

  function NoteModal({ entityType, entityId, note, onClose }: { entityType: string; entityId: string; note: SuiviNote | null; onClose: () => void }) {
    const [busy, setBusy] = useState(false);
    const [type, setType] = useState(note?.type ?? NOTE_TYPES[0]);
    const [date, setDate] = useState(note?.noteDate ?? todayISO());
    const [participants, setParticipants] = useState(note?.participants ?? "");
    const [summary, setSummary] = useState(note?.summary ?? "");
    async function save() {
      if (!summary.trim()) return;
      setBusy(true);
      const supabase = createClient();
      const payload = { entity_type: entityType, entity_id: entityId, type, note_date: date || null, participants: participants.trim() || null, summary: summary.trim() };
      if (note) await supabase.from("notes").update(payload).eq("id", note.id);
      else await supabase.from("notes").insert(payload);
      onClose(); router.refresh();
    }
    return (
      <Modal title={note ? "Modifier la note" : "Ajouter une note"} onClose={onClose}
        footer={<><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={busy || !summary.trim()} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer"}</button></>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}>{NOTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Field label="Participants"><Input value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Ex : Direction, fondateur" /></Field>
        <Field label="Compte-rendu"><Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Points discutés, décisions…" /></Field>
      </Modal>
    );
  }

  function TaskModal({ entityType, entityId, task, users, onClose }: { entityType: string; entityId: string; task: SuiviTask | null; users: FundUser[]; onClose: () => void }) {
    const [busy, setBusy] = useState(false);
    const [title, setTitle] = useState(task?.title ?? "");
    const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
    const [due, setDue] = useState(task?.dueDate ?? "");
    const [status, setStatus] = useState(task?.status ?? TASK_STATUS[0]);
    async function save() {
      if (!title.trim()) return;
      setBusy(true);
      const supabase = createClient();
      const label = users.find((u) => u.id === assigneeId)?.name ?? null;
      const payload = { entity_type: entityType, entity_id: entityId, title: title.trim(), assignee_id: assigneeId || null, assignee_label: label, due_date: due || null, status, source: "manuel" };
      if (task) await supabase.from("tasks").update(payload).eq("id", task.id);
      else await supabase.from("tasks").insert(payload);
      onClose(); router.refresh();
    }
    return (
      <Modal title={task ? "Modifier l'action" : "Ajouter une action"} onClose={onClose}
        footer={<><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={busy || !title.trim()} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer"}</button></>}>
        <Field label="Action"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Finaliser l'audit KYC" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Assigné à"><Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}><option value="">— Personne —</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
          <Field label="Échéance"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <Field label="Statut"><Select value={status} onChange={(e) => setStatus(e.target.value)}>{TASK_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
      </Modal>
    );
  }
}
