"use client";

import { useState } from "react";
import type { DocumentsData } from "@/lib/data/documents";

const CAT_COLOR: Record<string, string> = {
  Juridique: "#8A4B5A",
  Reporting: "#185FA5",
  Financier: "#3B6D11",
  Comité: "#B07A2E",
  ESG: "#7C7A3A",
};

export default function DocumentsClient({ data }: { data: DocumentsData }) {
  const [filter, setFilter] = useState<string>("all");
  const list = filter === "all" ? data.documents : data.documents.filter((d) => d.category === filter);

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
        <button className="btn btn-ghost" style={{ borderStyle: "dashed" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Ajouter un document
        </button>
      </div>

      <div className="card" style={{ padding: "4px 18px" }}>
        {list.map((d, i) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface-cream)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--camel)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h9l5 5v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{d.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>{d.linkedTo ? `Lié à ${d.linkedTo}` : "Général"}</div>
            </div>
            {d.category && (
              <span className="badge" style={{ background: `${CAT_COLOR[d.category] ?? "#6B5744"}1a`, color: CAT_COLOR[d.category] ?? "#6B5744" }}>{d.category}</span>
            )}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, cursor: "pointer" }}><path d="M12 3v12M7 11l5 4 5-4" /><path d="M5 21h14" /></svg>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10 }}>Le téléversement de fichiers (stockage sécurisé) sera activé prochainement.</div>
    </div>
  );
}
