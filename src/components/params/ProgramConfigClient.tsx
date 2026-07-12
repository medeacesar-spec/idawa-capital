"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ProgramConfig, ProgramIndicator } from "@/lib/data/params";
import { ACCOMPAGNEMENT_CATALOG, ACCOMP_CATEGORY_COLOR, PROGRAM_NATURES } from "@/lib/ui-constants";
import { Field, Input, Select } from "@/components/ui/form";

const panel: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 14 };
const h3: React.CSSProperties = { fontSize: 14.5, fontWeight: 600, margin: "0 0 4px", color: "var(--ink)" };

export default function ProgramConfigClient({ config }: { config: ProgramConfig }) {
  const router = useRouter();
  const supabase = createClient();
  const [nature, setNature] = useState(config.nature);
  const [status, setStatus] = useState(config.status);
  const [name, setName] = useState(config.name);
  const [inds, setInds] = useState<ProgramIndicator[]>(config.indicators);
  const [esgFw, setEsgFw] = useState(config.esgFramework ?? "");
  const [esgReq, setEsgReq] = useState(config.esgRequired);
  const [ehs, setEhs] = useState(config.ehsSector ?? "");
  const [customName, setCustomName] = useState<Record<string, string>>({});

  const showAccomp = nature === "accompagnement" || nature === "mixte";

  async function saveGeneral(patch: Record<string, unknown>) {
    await supabase.from("programs").update(patch).eq("id", config.id);
    router.refresh();
  }

  async function addIndicator(category: string, indName: string, unit: string) {
    const { data } = await supabase.from("program_indicators")
      .insert({ program_id: config.id, category, name: indName, unit, position: inds.length })
      .select("id, category, name, unit, target").single();
    if (data) setInds((x) => [...x, { id: data.id, category: data.category, name: data.name, unit: data.unit, target: null }]);
  }
  async function removeIndicator(id: string) {
    await supabase.from("program_indicators").delete().eq("id", id);
    setInds((x) => x.filter((i) => i.id !== id));
  }
  async function setTarget(id: string, target: number | null) {
    setInds((x) => x.map((i) => (i.id === id ? { ...i, target } : i)));
    await supabase.from("program_indicators").update({ target }).eq("id", id);
  }

  const isActive = (category: string, indName: string) => inds.some((i) => i.category === category && i.name === indName);

  return (
    <div>
      <Link href="/parametres" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-2)", marginBottom: 14 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        Retour aux programmes
      </Link>

      {/* Général */}
      <div style={panel}>
        <h3 style={h3}>Général</h3>
        <div style={{ height: 10 }} />
        <Field label="Nom du programme">
          <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => saveGeneral({ name })} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Nature">
            <Select value={nature} onChange={(e) => { const v = e.target.value as ProgramConfig["nature"]; setNature(v); saveGeneral({ nature: v }); }}>
              {PROGRAM_NATURES.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
            </Select>
          </Field>
          <Field label="Statut">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); saveGeneral({ status: e.target.value }); }}>
              {["Actif", "Clos"].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
      </div>

      {/* Indicateurs d'accompagnement */}
      {showAccomp && (
        <div style={panel}>
          <h3 style={h3}>Indicateurs d'accélération</h3>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>Choisissez les indicateurs suivis pour ce programme (cochez dans le catalogue, ajoutez les vôtres, et fixez une cible).</div>
          {ACCOMPAGNEMENT_CATALOG.map((cat) => {
            const color = ACCOMP_CATEGORY_COLOR[cat.category];
            const active = inds.filter((i) => i.category === cat.category);
            const available = cat.items.filter((it) => !isActive(cat.category, it.name));
            return (
              <div key={cat.category} style={{ marginTop: 14, paddingTop: 13, borderTop: "1px solid var(--sep)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{cat.category}</span>
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>{active.length}</span>
                </div>

                {/* Indicateurs sélectionnés — avec cible */}
                {active.map((i) => (
                  <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
                    <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink)" }}>{i.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-3)" }}>cible</span>
                      <input type="number" defaultValue={i.target ?? ""} onBlur={(e) => setTarget(i.id, e.target.value === "" ? null : Number(e.target.value))}
                        style={{ width: 90, padding: "5px 8px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", textAlign: "right", outline: "none" }} />
                      <span style={{ fontSize: 11, color: "var(--text-3)", width: 42 }}>{i.unit ?? ""}</span>
                      <button onClick={() => removeIndicator(i.id)} aria-label="Retirer" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--red-fg)", padding: 2 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Catalogue — à ajouter */}
                {available.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {available.map((it) => (
                      <button key={it.name} onClick={() => addIndicator(cat.category, it.name, it.unit)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: "var(--surface)", color: "var(--text-2)", border: "1px dashed var(--border-strong)" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                        {it.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Personnalisé */}
                <div style={{ display: "flex", gap: 6, marginTop: 8, maxWidth: 360 }}>
                  <input value={customName[cat.category] ?? ""} onChange={(e) => setCustomName({ ...customName, [cat.category]: e.target.value })}
                    placeholder="Indicateur personnalisé…" style={{ flex: 1, padding: "6px 9px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                  <button className="btn btn-ghost" style={{ padding: "6px 12px" }}
                    onClick={() => { const v = (customName[cat.category] ?? "").trim(); if (v) { addIndicator(cat.category, v, ""); setCustomName({ ...customName, [cat.category]: "" }); } }}>Ajouter</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paramètres ESG */}
      <div style={panel}>
        <h3 style={h3}>Paramètres ESG</h3>
        <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 12 }}>Cadre ESG appliqué aux entreprises de ce programme.</div>
        <Field label="Référentiel ESG">
          <Input value={esgFw} onChange={(e) => setEsgFw(e.target.value)} onBlur={() => saveGeneral({ esg_framework: esgFw })} />
        </Field>
        <Field label="Secteur EHS (IFC) par défaut" hint="Ex : Volailles, Transformation agroalimentaire, Énergie…">
          <Input value={ehs} onChange={(e) => setEhs(e.target.value)} onBlur={() => saveGeneral({ ehs_sector: ehs })} placeholder="Optionnel" />
        </Field>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <button onClick={() => { const v = !esgReq; setEsgReq(v); saveGeneral({ esg_required: v }); }}
            role="switch" aria-checked={esgReq}
            style={{ position: "relative", width: 44, height: 25, borderRadius: 999, border: "none", cursor: "pointer", background: esgReq ? "var(--espresso)" : "var(--border-strong)", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 3, left: esgReq ? 22 : 3, width: 19, height: 19, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
          </button>
          <span style={{ fontSize: 12.5, color: "var(--ink)" }}>Évaluation ESG obligatoire pour les entreprises du programme</span>
        </div>
      </div>
    </div>
  );
}
