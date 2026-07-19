"use client";

// Extraction à la carte — le catalogue des jeux de données.
//
// Ce composant est monté à DEUX endroits : l'onglet « Extraction » de Reporting, où l'on
// va spontanément, et la Passerelle Excel. La première version ne vivait que sur la
// passerelle, derrière un lien discret : l'écran d'extraction, lui, n'avait pas bougé —
// et de l'extérieur, rien n'avait changé.

import { useState } from "react";
import { Select } from "@/components/ui/form";

export type ExtractionSet = { key: string; label: string; group: string; hint: string };
type Program = { id: string; name: string };

export default function ExtractionPicker({ extractionSets, programs }: { extractionSets: ExtractionSet[]; programs: Program[] }) {
  const [sets, setSets] = useState<Set<string>>(new Set(["portefeuille"]));
  const [xProgram, setXProgram] = useState("");
  const [xTracking, setXTracking] = useState<"" | "equity" | "accompagnement">("");
  const [xFrom, setXFrom] = useState("");
  const [xTo, setXTo] = useState("");

  const extractionUrl = (() => {
    const p = new URLSearchParams({ jeux: [...sets].join(",") });
    if (xProgram) p.set("programme", xProgram);
    if (xTracking) p.set("suivi", xTracking);
    if (xFrom.trim()) p.set("de", xFrom.trim());
    if (xTo.trim()) p.set("a", xTo.trim());
    return `/reporting/excel/extraction?${p.toString()}`;
  })();

  const groups = [...new Set(extractionSets.map((s) => s.group))];

  return (
      <section className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Extraction à la carte</div>
        <div style={{ fontSize: 11.5, color: "var(--text-2)", marginBottom: 12 }}>
          Cochez ce que vous voulez sortir : tout arrive dans <strong>un seul classeur</strong>, une feuille par jeu.
          Une feuille vide signifie qu&apos;il n&apos;y a rien sur ce périmètre — pas un oubli.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14, marginBottom: 14 }}>
          {groups.map((g) => (
            <div key={g}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--camel)", marginBottom: 6 }}>{g}</div>
              {extractionSets.filter((s) => s.group === g).map((st) => (
                <label key={st.key} title={st.hint}
                  style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12.5, cursor: "pointer", padding: "3px 0" }}>
                  <input type="checkbox" checked={sets.has(st.key)} style={{ marginTop: 3 }}
                    onChange={(e) => setSets((s) => { const n = new Set(s); if (e.target.checked) n.add(st.key); else n.delete(st.key); return n; })} />
                  <span>{st.label}</span>
                </label>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11.5 }}
            onClick={() => setSets(new Set(extractionSets.map((s) => s.key)))}>Tout cocher</button>
          <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11.5 }}
            onClick={() => setSets(new Set())}>Tout décocher</button>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", borderTop: "1px solid var(--sep)", paddingTop: 12 }}>
          <div style={{ width: 200 }}>
            <label style={{ display: "block", fontSize: 11.5, color: "var(--text-2)", marginBottom: 4 }}>Programme</label>
            <Select value={xProgram} onChange={(e) => setXProgram(e.target.value)}>
              <option value="">Tous</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div style={{ width: 170 }}>
            <label style={{ display: "block", fontSize: 11.5, color: "var(--text-2)", marginBottom: 4 }}>Type de suivi</label>
            <Select value={xTracking} onChange={(e) => setXTracking(e.target.value as "" | "equity" | "accompagnement")}>
              <option value="">Tous</option>
              <option value="equity">Participations</option>
              <option value="accompagnement">Accélération</option>
            </Select>
          </div>
          <div style={{ width: 120 }}>
            <label style={{ display: "block", fontSize: 11.5, color: "var(--text-2)", marginBottom: 4 }}>De</label>
            <input value={xFrom} onChange={(e) => setXFrom(e.target.value)} placeholder="2024"
              style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--border-strong)", borderRadius: 10, fontSize: 13, fontFamily: "inherit" }} />
          </div>
          <div style={{ width: 120 }}>
            <label style={{ display: "block", fontSize: 11.5, color: "var(--text-2)", marginBottom: 4 }}>À</label>
            <input value={xTo} onChange={(e) => setXTo(e.target.value)} placeholder="2026-T2"
              style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--border-strong)", borderRadius: 10, fontSize: 13, fontFamily: "inherit" }} />
          </div>
          <a href={sets.size ? extractionUrl : undefined} className="btn btn-primary"
            style={{ textDecoration: "none", display: "inline-flex", opacity: sets.size ? 1 : 0.45, pointerEvents: sets.size ? "auto" : "none" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
            Extraire {sets.size} jeu{sets.size > 1 ? "x" : ""}
          </a>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8 }}>
          Les bornes acceptent un exercice (« 2024 ») ou un trimestre (« 2026-T2 »). Laissées vides, tout est extrait.
        </div>
      </section>
  );
}
