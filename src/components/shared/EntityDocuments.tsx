"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DocumentUploadModal from "@/components/documents/DocumentUploadModal";
import SortToggle, { type DocSort } from "@/components/documents/SortToggle";
import { useCanEdit } from "./WriteAccess";
import { hasTarget, openDocument } from "@/lib/doc-links";

type Doc = { id: string; title: string; category: string | null; storagePath: string | null; url?: string | null; createdAt?: string | null };

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDate(d?: string | null) { if (!d) return ""; const dt = d.slice(0, 10); return `${parseInt(dt.slice(8, 10), 10)} ${MONTHS[parseInt(dt.slice(5, 7), 10) - 1] ?? ""} ${dt.slice(0, 4)}`; }

export default function EntityDocuments({ entityType, entityId, entityName, docs }: { entityType: "deal" | "company"; entityId: string; entityName: string; docs: Doc[] }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [sort, setSort] = useState<DocSort>("recent");
  const sorted = [...docs].sort((a, b) =>
    sort === "alpha"
      ? a.title.localeCompare(b.title, "fr", { sensitivity: "base" })
      : (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  );

  const open = (d: Doc) => openDocument(d);
  async function remove(d: Doc) {
    if (!confirm(`Supprimer « ${d.title} » ?`)) return;
    const supabase = createClient();
    if (d.storagePath) await supabase.storage.from("documents").remove([d.storagePath]);
    await supabase.from("documents").delete().eq("id", d.id);
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>Documents rattachés</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {docs.length > 1 && <SortToggle sort={sort} setSort={setSort} />}
          {canEdit && (<button className="btn btn-primary" onClick={() => setModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Ajouter un document
          </button>)}
        </div>
      </div>
      {docs.length === 0 ? (
        <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun document. Cliquez « Ajouter un document ».</div>
      ) : (
        <div className="card" style={{ padding: "4px 18px" }}>
          {sorted.map((d, i) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
              <div onClick={() => open(d)} title={d.url ? "Ouvrir le lien" : d.storagePath ? "Ouvrir le fichier" : "Aucun fichier joint"} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, cursor: hasTarget(d) ? "pointer" : "default" }}>
                {d.url ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--camel)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg> : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--camel)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h9l5 5v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /></svg>}
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: hasTarget(d) ? "var(--espresso)" : "var(--ink)" }}>{d.title}{d.createdAt ? <span style={{ color: "var(--text-3)", fontWeight: 400 }}> · {frDate(d.createdAt)}</span> : null}{d.url ? " · lien" : !d.storagePath ? " · aucun fichier" : ""}</span>
              </div>
              {d.category && <span className="badge badge-neutral">{d.category}</span>}
              <div className="row-actions" style={{ display: canEdit ? undefined : "none" }}>
                {hasTarget(d) && <button onClick={() => open(d)} aria-label="Ouvrir"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 4 5-4" /><path d="M5 21h14" /></svg></button>}
                <button onClick={() => remove(d)} aria-label="Supprimer"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && <DocumentUploadModal entities={[{ id: entityId, name: entityName, type: entityType }]} presetEntity={{ id: entityId, type: entityType }} onClose={() => setModal(false)} />}
    </div>
  );
}
