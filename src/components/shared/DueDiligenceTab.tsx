"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { DD_DOMAINS, DD_STATUS } from "@/lib/ui-constants";
import type { DdItem } from "@/lib/data/planning";
import type { FundUser } from "@/lib/data/users";

const STATUS_BADGE: Record<string, string> = { "À faire": "badge-neutral", "En cours": "badge-amber", "Terminé": "badge-green", "Point d'attention": "badge-red" };

export default function DueDiligenceTab({ entityType, entityId, items, users }: { entityType: "deal" | "company"; entityId: string; items: DdItem[]; users: FundUser[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; item: DdItem | null; domain?: string }>({ open: false, item: null });

  const domains = [...DD_DOMAINS, ...Array.from(new Set(items.map((i) => i.domain))).filter((d) => !DD_DOMAINS.includes(d))];
  const done = items.filter((i) => i.status === "Terminé").length;
  const flags = items.filter((i) => i.status === "Point d'attention").length;

  async function del(id: string) { if (!confirm("Supprimer cet élément ?")) return; await createClient().from("dd_items").delete().eq("id", id); router.refresh(); }
  async function cycle(it: DdItem) {
    const next = DD_STATUS[(DD_STATUS.indexOf(it.status) + 1) % DD_STATUS.length];
    await createClient().from("dd_items").update({ status: next }).eq("id", it.id); router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
          <b style={{ color: "var(--ink)" }}>{done}/{items.length}</b> terminés
          {flags > 0 && <span style={{ color: "var(--red-fg)", marginLeft: 10 }}>· {flags} point{flags > 1 ? "s" : ""} d'attention</span>}
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, item: null })}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Ajouter un point
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucune activité de due diligence. Ajoutez les points à vérifier par domaine (financière, juridique, commerciale…).</div>
      ) : (
        domains.filter((d) => items.some((i) => i.domain === d)).map((dom) => (
          <div key={dom} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--camel)", marginBottom: 6 }}>{dom}</div>
            <div className="card" style={{ padding: "4px 18px" }}>
              {items.filter((i) => i.domain === dom).map((it, idx) => (
                <div key={it.id} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 0", borderTop: idx === 0 ? "none" : "1px solid var(--sep)" }}>
                  <button onClick={() => cycle(it)} title="Changer le statut" style={{ border: "none", background: "none", cursor: "pointer", padding: 0, marginTop: 1 }}>
                    <span className={`badge ${STATUS_BADGE[it.status] ?? "badge-neutral"}`} style={{ cursor: "pointer", minWidth: 92, textAlign: "center" }}>{it.status}</span>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--ink)" }}>{it.item}</div>
                    {it.note && <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 2, lineHeight: 1.5 }}>{it.note}</div>}
                  </div>
                  <div className="row-actions">
                    <button onClick={() => setModal({ open: true, item: it })} aria-label="Modifier"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
                    <button onClick={() => del(it.id)} aria-label="Supprimer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Cliquez le statut pour le faire évoluer (À faire → En cours → Terminé → Point d'attention).</div>

      {modal.open && <DdModal entityType={entityType} entityId={entityId} item={modal.item} users={users} onClose={() => setModal({ open: false, item: null })} />}
    </div>
  );

  function DdModal({ entityType, entityId, item, users, onClose }: { entityType: string; entityId: string; item: DdItem | null; users: FundUser[]; onClose: () => void }) {
    const [busy, setBusy] = useState(false);
    const [domain, setDomain] = useState(item?.domain ?? DD_DOMAINS[0]);
    const [text, setText] = useState(item?.item ?? "");
    const [status, setStatus] = useState(item?.status ?? DD_STATUS[0]);
    const [note, setNote] = useState(item?.note ?? "");
    const [assigneeId, setAssigneeId] = useState(item?.assigneeId ?? "");
    async function save() {
      if (!text.trim()) return;
      setBusy(true);
      const supabase = createClient();
      const payload = { entity_type: entityType, entity_id: entityId, domain, item: text.trim(), status, note: note.trim() || null, assignee_id: assigneeId || null };
      if (item) await supabase.from("dd_items").update(payload).eq("id", item.id);
      else await supabase.from("dd_items").insert(payload);
      onClose(); router.refresh();
    }
    return (
      <Modal title={item ? "Modifier le point" : "Ajouter un point de due diligence"} onClose={onClose}
        footer={<><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={busy || !text.trim()} onClick={save}>{busy ? "…" : "Enregistrer"}</button></>}>
        <Field label="Point à vérifier"><Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex : Audit des comptes 2024" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Domaine"><Select value={domain} onChange={(e) => setDomain(e.target.value)}>{DD_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}</Select></Field>
          <Field label="Statut"><Select value={status} onChange={(e) => setStatus(e.target.value)}>{DD_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
        </div>
        <Field label="Assigné à"><Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}><option value="">— Personne —</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        <Field label="Constat / note"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Conclusions, réserves, documents demandés…" /></Field>
      </Modal>
    );
  }
}
