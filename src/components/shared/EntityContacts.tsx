"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ContactFormModal from "@/components/contacts/ContactFormModal";
import ChannelIcons from "@/components/contacts/ChannelIcons";
import { useCanEdit } from "./WriteAccess";

type C = { id: string; name: string; function: string | null; email: string | null; phone?: string | null; whatsapp?: string | null; website?: string | null; linkedin?: string | null; twitter?: string | null; instagram?: string | null };
function initials(name: string) { const caps = name.replace(/[^A-Z]/g, ""); return caps.length >= 2 ? caps.slice(0, 2) : name.slice(0, 2).toUpperCase(); }

export default function EntityContacts({ entityType, entityId, contacts }: { entityType: "deal" | "company"; entityId: string; contacts: C[] }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const link = entityType === "deal" ? { dealId: entityId } : { companyId: entityId };

  async function remove(c: C) {
    if (!confirm(`Retirer « ${c.name} » ?`)) return;
    await createClient().from("contacts").delete().eq("id", c.id);
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>Contacts rattachés</div>
        {canEdit && (<button className="btn btn-primary" onClick={() => setModal(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Ajouter un contact
        </button>)}
      </div>
      {contacts.length === 0 ? (
        <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun contact rattaché. Cliquez « Ajouter un contact ».</div>
      ) : (
        <div className="card" style={{ padding: "4px 18px" }}>
          {contacts.map((ct, i) => (
            <div key={ct.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--espresso)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{initials(ct.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{ct.name}</div><div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{ct.function ?? "—"}</div></div>
              <ChannelIcons c={ct} size={26} />
              <div className="row-actions" style={{ display: canEdit ? undefined : "none" }}>
                <button onClick={() => remove(ct)} aria-label="Retirer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && <ContactFormModal contact={null} link={link} onClose={() => setModal(false)} />}
    </div>
  );
}
