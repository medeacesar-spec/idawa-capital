"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CommitteeDoc } from "@/lib/data/dealDetail";
import { useCanEdit } from "@/components/shared/WriteAccess";

export default function CommitteeDocs({ dealId, companyId, committeeId, docs }: { dealId?: string; companyId?: string; committeeId: string; docs: CommitteeDoc[] }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`;
    const up = await supabase.storage.from("documents").upload(path, file);
    if (!up.error) {
      await supabase.from("documents").insert({ title: file.name.replace(/\.[^.]+$/, ""), category: "Comité", storage_path: path, deal_id: dealId ?? null, company_id: companyId ?? null, committee_id: committeeId });
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }
  async function open(d: CommitteeDoc) {
    if (!d.storagePath) return;
    const { data } = await createClient().storage.from("documents").createSignedUrl(d.storagePath, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }
  async function remove(d: CommitteeDoc) {
    if (!confirm(`Supprimer « ${d.title} » ?`)) return;
    const supabase = createClient();
    if (d.storagePath) await supabase.storage.from("documents").remove([d.storagePath]);
    await supabase.from("documents").delete().eq("id", d.id);
    router.refresh();
  }

  return (
    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {docs.map((d) => (
        <span key={d.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 7, background: "var(--surface-cream)", fontSize: 11 }}>
          <button onClick={() => open(d)} title="Ouvrir le CR" style={{ border: "none", background: "none", cursor: d.storagePath ? "pointer" : "default", color: "var(--espresso)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, padding: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h9l5 5v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /></svg>
            {d.title}
          </button>
          {canEdit && <button onClick={() => remove(d)} title="Supprimer" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-3)", padding: 0, display: "flex" }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>}
        </span>
      ))}
      {canEdit && <button onClick={() => fileRef.current?.click()} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "var(--surface)", color: "var(--camel)", border: "1px dashed var(--border-strong)", fontFamily: "inherit" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
        {busy ? "Envoi…" : "Joindre le CR"}
      </button>}
      <input ref={fileRef} type="file" onChange={onFile} style={{ display: "none" }} />
    </div>
  );
}
