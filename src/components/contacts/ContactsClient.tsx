"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ContactsData, Contact } from "@/lib/data/contacts";
import ContactFormModal from "./ContactFormModal";

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function ContactRow({ c, onEdit, onDelete }: { c: Contact; onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0" }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--espresso)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{initials(c.name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{c.function ?? "—"}</div>
      </div>
      {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: 11.5, color: "var(--camel)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 170 }}>{c.email}</a>}
      <div className="row-actions">
        <button onClick={onEdit} aria-label="Modifier"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
        <button onClick={onDelete} aria-label="Supprimer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
      </div>
    </div>
  );
}

export default function ContactsClient({ data }: { data: ContactsData }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [modal, setModal] = useState<{ open: boolean; contact: Contact | null }>({ open: false, contact: null });
  const groups = filter === "all" ? data.groups : data.groups.filter((g) => g.orgType === filter);

  async function remove(c: Contact) {
    if (!confirm(`Supprimer le contact « ${c.name} » ?`)) return;
    const supabase = createClient();
    await supabase.from("contacts").delete().eq("id", c.id);
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", ...data.orgTypes].map((t) => {
            const on = t === filter;
            return (
              <button key={t} onClick={() => setFilter(t)}
                style={{ padding: "7px 13px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)", border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}` }}>
                {t === "all" ? "Toutes les organisations" : t}
              </button>
            );
          })}
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, contact: null })}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Nouveau contact
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 14 }}>
        <b className="tnum" style={{ color: "var(--ink)" }}>{data.total}</b> contacts · {groups.length} organisations
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        {groups.map((g) => (
          <div key={g.organization} className="card" style={{ padding: "13px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, paddingBottom: 8, borderBottom: "1px solid var(--sep)" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{g.organization}</span>
              {g.orgType && <span className="badge badge-neutral" style={{ fontSize: 10 }}>{g.orgType}</span>}
            </div>
            {g.contacts.map((c) => <ContactRow key={c.id} c={c} onEdit={() => setModal({ open: true, contact: c })} onDelete={() => remove(c)} />)}
          </div>
        ))}
      </div>

      {modal.open && <ContactFormModal contact={modal.contact} onClose={() => setModal({ open: false, contact: null })} />}
    </div>
  );
}
