"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KPI_DIMENSIONS, KPI_DIM_COLOR } from "@/lib/ui-constants";

type Company = { id: string; name: string; subSectorId: string | null };
type Kpi = { id: string; category: string; name: string; unit: string | null; target: number | null; value: string };

const CATS = KPI_DIMENSIONS;
const CAT_COLOR = KPI_DIM_COLOR;

export default function SaisieClient({ companies, entityType = "company", scopeLabel = "Portefeuille · participation", preselect = null }: { companies: Company[]; entityType?: "deal" | "company"; scopeLabel?: string; preselect?: string | null }) {
  const supabase = createClient();
  const [companyId, setCompanyId] = useState((preselect && companies.some((c) => c.id === preselect) ? preselect : companies[0]?.id) ?? "");
  const [period, setPeriod] = useState("2026-T2");
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [basket, setBasket] = useState<{ category: string; name: string }[]>([]);
  const [showBasket, setShowBasket] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const company = companies.find((c) => c.id === companyId);

  async function load() {
    if (!companyId) return;
    setLoading(true);
    const { data: tracked } = await supabase.from("tracked_kpis").select("id, category, name, unit, target").eq("entity_type", entityType).eq("entity_id", companyId);
    const ids = (tracked ?? []).map((t) => t.id);
    const valMap = new Map<string, number>();
    if (ids.length) {
      const { data: vals } = await supabase.from("kpi_values").select("tracked_kpi_id, value").eq("period", period).in("tracked_kpi_id", ids);
      (vals ?? []).forEach((v) => valMap.set(v.tracked_kpi_id, Number(v.value)));
    }
    setKpis((tracked ?? []).map((t) => ({ id: t.id, category: t.category, name: t.name, unit: t.unit, target: t.target != null ? Number(t.target) : null, value: valMap.has(t.id) ? String(valMap.get(t.id)) : "" })));
    setLoading(false);
  }
  useEffect(() => { load(); setSaved(false); /* eslint-disable-next-line */ }, [companyId, period]);

  async function loadBasket() {
    if (!company?.subSectorId) { setBasket([]); return; }
    const { data } = await supabase.from("kpi_library").select("category, name").eq("sub_sector_id", company.subSectorId).order("position");
    const existing = new Set(kpis.map((k) => k.name));
    setBasket((data ?? []).filter((x) => !existing.has(x.name)).map((x) => ({ category: x.category, name: x.name })));
    setShowBasket(true);
  }

  async function addKpi(category: string, name: string) {
    const { data } = await supabase.from("tracked_kpis").insert({ entity_type: entityType, entity_id: companyId, kind: "business", category, name }).select("id, category, name, unit, target").single();
    if (data) { setKpis((k) => [...k, { id: data.id, category: data.category, name: data.name, unit: data.unit, target: data.target, value: "" }]); setBasket((b) => b.filter((x) => x.name !== name)); }
  }
  async function removeKpi(id: string) {
    await supabase.from("tracked_kpis").delete().eq("id", id);
    setKpis((k) => k.filter((x) => x.id !== id));
  }

  async function save() {
    for (const k of kpis) {
      if (k.value === "") continue;
      await supabase.from("kpi_values").upsert({ tracked_kpi_id: k.id, period, value: Number(k.value) }, { onConflict: "tracked_kpi_id,period" });
    }
    setSaved(true);
  }

  const sel: React.CSSProperties = { padding: "8px 11px", border: "1px solid var(--border-strong)", borderRadius: 10, background: "var(--surface)", color: "var(--ink)", fontSize: 13, fontFamily: "inherit", cursor: "pointer" };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 5 }}>{entityType === "deal" ? "Dossier" : "Société"} <span style={{ fontWeight: 400, color: "var(--text-3)" }}>· {scopeLabel}</span></div>
          <select style={{ ...sel, minWidth: 200 }} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 5 }}>Période</div>
          <input style={sel} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-T2" />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={loadBasket}>+ Ajouter des KPIs</button>
          <button className="btn btn-primary" onClick={save} disabled={kpis.length === 0}>Enregistrer</button>
        </div>
      </div>

      {saved && <div style={{ fontSize: 12.5, color: "var(--green-fg)", background: "var(--green-bg)", borderRadius: 8, padding: "9px 12px", marginBottom: 12 }}>✅ Reporting enregistré pour {company?.name} — {period}.</div>}

      {showBasket && (
        <div className="card" style={{ padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Ajouter des indicateurs (bibliothèque du secteur)</div>
            <button onClick={() => setShowBasket(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-3)" }}>Fermer</button>
          </div>
          {basket.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-3)" }}>Aucun indicateur disponible (secteur non défini ou tous déjà ajoutés).</div> : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {basket.map((b) => (
                <button key={b.name} onClick={() => addKpi(b.category, b.name)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: "var(--surface)", color: "var(--text-2)", border: "1px dashed var(--border-strong)" }}>
                  + {b.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? <div style={{ fontSize: 13, color: "var(--text-3)" }}>Chargement…</div> : kpis.length === 0 ? (
        <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun KPI suivi pour cette société. Cliquez « + Ajouter des KPIs » pour en choisir dans la bibliothèque.</div>
      ) : (
        <div className="card" style={{ padding: "6px 18px" }}>
          {CATS.map((cat) => {
            const items = kpis.filter((k) => k.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} style={{ padding: "12px 0", borderTop: "1px solid var(--sep)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: CAT_COLOR[cat] }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{cat}</span>
                </div>
                {items.map((k) => (
                  <div key={k.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px 30px", gap: 10, alignItems: "center", padding: "6px 0" }}>
                    <span style={{ fontSize: 12.5, color: "var(--ink)" }}>{k.name}</span>
                    <span style={{ fontSize: 11.5, color: "var(--text-3)", textAlign: "right" }}>cible {k.target ?? "—"}</span>
                    <input type="number" value={k.value} onChange={(e) => setKpis((arr) => arr.map((x) => x.id === k.id ? { ...x, value: e.target.value } : x))}
                      placeholder={k.unit ?? "valeur"} style={{ padding: "6px 9px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", textAlign: "right", outline: "none", width: "100%" }} />
                    <button onClick={() => removeKpi(k.id)} aria-label="Retirer" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-3)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
