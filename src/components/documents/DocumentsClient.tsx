"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DocumentsData, DocRow } from "@/lib/data/documents";
import DocumentUploadModal from "./DocumentUploadModal";
import SortToggle from "./SortToggle";

const CAT_COLOR: Record<string, string> = { Juridique: "#8A4B5A", Reporting: "#185FA5", Financier: "#3B6D11", Comité: "#B07A2E", ESG: "#7C7A3A" };
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDate(d: string | null) { if (!d) return ""; const dt = d.slice(0, 10); return `${parseInt(dt.slice(8, 10), 10)} ${MONTHS[parseInt(dt.slice(5, 7), 10) - 1] ?? ""} ${dt.slice(0, 4)}`; }

export default function DocumentsClient({ data }: { data: DocumentsData }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "alpha">("recent");
  const [modal, setModal] = useState(false);
  const filtered = filter === "all" ? data.documents : data.documents.filter((d) => d.category === filter);
  // Tri alphabétique = par NOM D'ENTREPRISE (le titre ne départage qu'à entreprise égale).
  // Les documents généraux, non rattachés à une entreprise, sont renvoyés en fin de liste.
  const list = [...filtered].sort((a, b) => {
    if (sort !== "alpha") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    if (!a.linkedTo !== !b.linkedTo) return a.linkedTo ? -1 : 1;
    const byEntity = (a.linkedTo ?? "").localeCompare(b.linkedTo ?? "", "fr", { sensitivity: "base" });
    return byEntity !== 0 ? byEntity : a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
  });

  async function download(d: DocRow) {
    if (!d.storagePath) return;
    const supabase = createClient();
    const { data: signed } = await supabase.storage.from("documents").createSignedUrl(d.storagePath, 120);
    if (signed?.signedUrl) window.open(signed.signedUrl, "_blank");
  }
  async function remove(d: DocRow) {
    if (!confirm(`Supprimer « ${d.title} » ?`)) return;
    const supabase = createClient();
    if (d.storagePath) await supabase.storage.from("documents").remove([d.storagePath]);
    await supabase.from("documents").delete().eq("id", d.id);
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", ...data.categories].map((t) => {
            const on = t === filter;
            return (
              <button key={t} onClick={() => setFilter(t)}
                style={{ padding: "7px 13px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)", border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}` }}>
                {t === "all" ? "Tous" : t}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SortToggle sort={sort} setSort={setSort} alphaLabel="A → Z (entreprise)" />
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Déposer un document
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun document. Cliquez « Déposer un document ».</div>
      ) : (
        <div className="card" style={{ padding: "4px 18px" }}>
          {list.map((d, i) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
              <div
                onClick={() => d.storagePath && download(d)}
                title={d.storagePath ? "Ouvrir le fichier" : "Aucun fichier joint"}
                style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, cursor: d.storagePath ? "pointer" : "default" }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface-cream)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--camel)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h9l5 5v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: d.storagePath ? "var(--espresso)" : "var(--ink)" }}>{d.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{d.linkedTo ? `Lié à ${d.linkedTo}` : "Général"}{d.createdAt ? ` · ${frDate(d.createdAt)}` : ""}{!d.storagePath ? " · aucun fichier" : ""}</div>
                </div>
              </div>
              {d.category && <span className="badge" style={{ background: `${CAT_COLOR[d.category] ?? "#6B5744"}1a`, color: CAT_COLOR[d.category] ?? "#6B5744" }}>{d.category}</span>}
              <div className="row-actions">
                {d.storagePath && <button onClick={() => download(d)} aria-label="Ouvrir" title="Ouvrir"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 4 5-4" /><path d="M5 21h14" /></svg></button>}
                <button onClick={() => remove(d)} aria-label="Supprimer" title="Supprimer"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <DocumentUploadModal entities={data.entities} onClose={() => setModal(false)} />}
    </div>
  );
}
