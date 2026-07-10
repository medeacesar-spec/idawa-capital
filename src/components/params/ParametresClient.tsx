"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProgramRow } from "@/lib/data/params";

const NATURES: { key: ProgramRow["nature"]; label: string }[] = [
  { key: "invest", label: "Investissement" },
  { key: "mixte", label: "Mixte" },
  { key: "accompagnement", label: "Accompagnement" },
];

const NATURE_NOTE: Record<ProgramRow["nature"], string> = {
  invest: "Métriques financières : investi, valeur, TVPI, TRI, cap table.",
  accompagnement: "Activité & impact : budget, bénéficiaires, jours d'AT, emplois.",
  mixte: "Les deux grilles : financière et activité/impact.",
};

export default function ParametresClient({ programs }: { programs: ProgramRow[] }) {
  const [rows, setRows] = useState(programs);
  const [saving, setSaving] = useState<string | null>(null);

  async function setNature(id: string, nature: ProgramRow["nature"]) {
    const prev = rows;
    setRows((r) => r.map((p) => (p.id === id ? { ...p, nature } : p)));
    setSaving(id);
    const supabase = createClient();
    const { error } = await supabase.from("programs").update({ nature }).eq("id", id);
    setSaving(null);
    if (error) setRows(prev); // rollback si échec
  }

  return (
    <div>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 16 }}>
        Définissez la <b>nature</b> de chaque programme. Elle détermine les métriques suivies et l'affichage sur le tableau de bord, la performance et le reporting.
      </div>

      <div className="card" style={{ padding: "4px 18px" }}>
        {rows.map((p, i) => (
          <div key={p.id} style={{ padding: "16px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
              {p.status === "Clos" && <span className="badge badge-neutral">Clos</span>}
              {saving === p.id && <span style={{ fontSize: 11, color: "var(--text-3)" }}>enregistrement…</span>}
            </div>
            <div style={{ display: "flex", gap: 0, border: "1px solid var(--border-strong)", borderRadius: 10, overflow: "hidden", width: "fit-content", maxWidth: "100%", flexWrap: "wrap" }}>
              {NATURES.map((n) => {
                const on = p.nature === n.key;
                return (
                  <button key={n.key} onClick={() => setNature(p.id, n.key)}
                    style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", border: "none",
                      background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)" }}>
                    {n.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 8 }}>{NATURE_NOTE[p.nature]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
