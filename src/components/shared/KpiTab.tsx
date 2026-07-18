"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import { KPI_DIMENSIONS, KPI_DIM_LABEL, KPI_DIM_COLOR, KPI_DIRECTIONS } from "@/lib/ui-constants";
import type { KpiSeries, LibraryKpi } from "@/lib/data/kpis";
import { derive, budgetTarget, sourceFor, OHADA_KPIS, type BudgetRow } from "@/lib/finance/kpiSources";
import KpiAutoFillModal from "./KpiAutoFillModal";
import { useCanEdit } from "./WriteAccess";

function shortPeriod(p: string) { const m = p.match(/(\d{4})-?T?(\d)?/); return m && m[2] ? `T${m[2]}-${m[1].slice(2)}` : p; }
function nf(n: number) { return new Intl.NumberFormat("fr-FR").format(Math.round(n * 100) / 100); }

function Chart({ k }: { k: KpiSeries }) {
  const w = 400, h = 96, s = k.series;
  if (s.length < 2) return <div style={{ fontSize: 11.5, color: "var(--text-3)", padding: "16px 0", textAlign: "center" }}>Pas assez de valeurs pour tracer la courbe.</div>;
  const vals = s.map((x) => x.value);
  const all = k.target != null ? [...vals, k.target] : vals;
  let mn = Math.min(...all), mx = Math.max(...all);
  const pad = (mx - mn) * 0.15 || 1; mn -= pad; mx += pad;
  const X = (i: number) => 6 + (i * (w - 12)) / (s.length - 1);
  const Y = (v: number) => h - 8 - ((v - mn) / (mx - mn)) * (h - 18);
  const pts = s.map((x, i) => `${X(i).toFixed(1)},${Y(x.value).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
      {k.target != null && <line x1="6" y1={Y(k.target)} x2={w - 6} y2={Y(k.target)} stroke="var(--camel)" strokeWidth="1.6" strokeDasharray="5 4" />}
      <polyline points={pts} fill="none" stroke="var(--espresso)" strokeWidth="2.2" />
      {s.map((x, i) => <circle key={i} cx={X(i)} cy={Y(x.value)} r={i === s.length - 1 ? 3.6 : 2.2} fill="var(--espresso)" />)}
    </svg>
  );
}

export default function KpiTab({ entityType, entityId, kpis, library, statements, budget }: {
  entityType: "deal" | "company";
  entityId: string;
  kpis: KpiSeries[];
  library: LibraryKpi[];
  /** États financiers OHADA de la société, quand ils existent : ils permettent de reprendre
   *  les KPIs financiers sans les ressaisir. Absents sur un dossier. */
  statements?: Record<number, Record<string, number>>;
  /** Grille Budget & BP : complète les exercices sans états financiers et fournit les cibles. */
  budget?: BudgetRow[];
}) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const present = Array.from(new Set(kpis.map((k) => k.category)));
  const dims = [...KPI_DIMENSIONS, ...present.filter((p) => !KPI_DIMENSIONS.includes(p))];
  const firstWithData = dims.find((d) => kpis.some((k) => k.category === d)) ?? dims[0];
  const [cat, setCat] = useState(firstWithData);
  const [kpiModal, setKpiModal] = useState<{ open: boolean; kpi: KpiSeries | null }>({ open: false, kpi: null });
  const [valModal, setValModal] = useState<{ open: boolean; kpi: KpiSeries } | null>(null);
  const [autoFill, setAutoFill] = useState(false);

  const inCat = kpis.filter((k) => k.category === cat);
  // Nombre de KPIs suivis dont la valeur est déjà contenue dans les états financiers.
  const derivable = statements
    ? kpis.filter((k) => derive(k.name, statements, budget ?? []).length > 0 || budgetTarget(k.name, budget ?? []) != null).length
    : 0;

  async function delKpi(id: string) {
    if (!confirm("Supprimer ce KPI et toutes ses valeurs ?")) return;
    const supabase = createClient();
    await supabase.from("kpi_values").delete().eq("tracked_kpi_id", id);
    await supabase.from("tracked_kpis").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {dims.map((d) => {
            const on = d === cat; const count = kpis.filter((k) => k.category === d).length;
            return <button key={d} onClick={() => setCat(d)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)", border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}` }}>{KPI_DIM_LABEL[d] ?? d}{count > 0 ? ` (${count})` : ""}</button>;
          })}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canEdit && derivable > 0 && (
            <button className="btn" onClick={() => setAutoFill(true)}
              title="Reprendre les KPIs financiers depuis les états financiers et la grille Budget &amp; BP">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></svg>
              Alimenter depuis les chiffres saisis ({derivable})
            </button>
          )}
          {canEdit && (<button className="btn btn-primary" onClick={() => setKpiModal({ open: true, kpi: null })}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Ajouter un KPI
          </button>)}
        </div>
      </div>

      {inCat.length === 0 ? (
        <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun KPI « {KPI_DIM_LABEL[cat] ?? cat} » suivi. Cliquez « Ajouter un KPI » pour en créer un dans cette dimension.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
          {inCat.map((k) => {
            const last = k.series.length ? k.series[k.series.length - 1].value : null;
            const prev = k.series.length > 1 ? k.series[k.series.length - 2].value : null;
            const chg = prev != null && prev !== 0 && last != null ? ((last - prev) / Math.abs(prev)) * 100 : null;
            const good = last == null || k.target == null ? null : k.direction === "low" ? last <= k.target : last >= k.target;
            return (
              <div key={k.id} className="card" style={{ padding: "14px 15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{k.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {good != null && <span className={`badge ${good ? "badge-green" : "badge-amber"}`}>{good ? "Sur objectif" : "En retard"}</span>}
                    <span className="row-actions" style={{ display: canEdit ? undefined : "none" }}>
                      <button onClick={() => setKpiModal({ open: true, kpi: k })} aria-label="Modifier le KPI"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
                      <button onClick={() => delKpi(k.id)} aria-label="Supprimer le KPI"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                  <span className="serif tnum" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>{last != null ? nf(last) : "—"}{k.unit ? ` ${k.unit}` : ""}</span>
                  {chg != null && <span style={{ fontSize: 11.5, fontWeight: 600, color: chg >= 0 ? "var(--green-fg)" : "var(--red-fg)" }}>{chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}%</span>}
                </div>
                <Chart k={k} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>
                  <span>{k.series.length ? shortPeriod(k.series[0].period) : ""}{k.series.length > 1 ? ` → ${shortPeriod(k.series[k.series.length - 1].period)}` : ""}</span>
                  {k.target != null && <span style={{ color: "var(--camel)", fontWeight: 600 }}>cible {nf(k.target)}{k.unit ? ` ${k.unit}` : ""}</span>}
                </div>
                {canEdit && <button onClick={() => setValModal({ open: true, kpi: k })} className="btn btn-ghost" style={{ width: "100%", marginTop: 10, padding: "6px", fontSize: 11.5 }}>+ Saisir une valeur</button>}
              </div>
            );
          })}
        </div>
      )}

      {kpiModal.open && <KpiModal entityType={entityType} entityId={entityId} defaultCat={cat} kpi={kpiModal.kpi} library={library} trackedNames={new Set(kpis.map((k) => k.name))} onClose={() => setKpiModal({ open: false, kpi: null })} />}

      {autoFill && statements && <KpiAutoFillModal kpis={kpis} statements={statements} budget={budget ?? []} onClose={() => setAutoFill(false)} />}
      {valModal?.open && <ValueModal kpi={valModal.kpi} onClose={() => setValModal(null)} />}
    </div>
  );

  function KpiModal({ entityType, entityId, defaultCat, kpi, library, trackedNames, onClose }: { entityType: string; entityId: string; defaultCat: string; kpi: KpiSeries | null; library: LibraryKpi[]; trackedNames: Set<string>; onClose: () => void }) {
    const available = library.filter((l) => !trackedNames.has(l.name));
    const [added, setAdded] = useState<Set<string>>(new Set());
    const [mode, setMode] = useState<"library" | "ohada" | "custom">(!kpi && available.length > 0 ? "library" : "custom");
    const [busy, setBusy] = useState(false);
    const [name, setName] = useState(kpi?.name ?? "");
    const [category, setCategory] = useState(kpi?.category ?? defaultCat);
    const [unit, setUnit] = useState(kpi?.unit ?? "");
    const [target, setTarget] = useState(kpi?.target != null ? String(kpi.target) : "");
    const [direction, setDirection] = useState(kpi?.direction ?? "high");

    async function addFromLibrary(l: LibraryKpi) {
      await createClient().from("tracked_kpis").insert({ entity_type: entityType, entity_id: entityId, kind: "business", category: l.category, name: l.name });
      setAdded((s) => new Set(s).add(l.name));
    }
    async function addOhada(k: (typeof OHADA_KPIS)[number]) {
      await createClient().from("tracked_kpis").insert({
        entity_type: entityType, entity_id: entityId, kind: "business",
        category: "Financier", name: k.name, unit: k.unit, direction: k.direction,
      });
      setAdded((s) => new Set(s).add(k.name));
    }
    function closeAndRefresh() { onClose(); router.refresh(); }

    async function save() {
      if (!name.trim()) return;
      setBusy(true);
      const supabase = createClient();
      const payload = { entity_type: entityType, entity_id: entityId, kind: "business", category, name: name.trim(), unit: unit.trim() || null, target: target ? Number(target) : null, direction };
      if (kpi) await supabase.from("tracked_kpis").update(payload).eq("id", kpi.id);
      else await supabase.from("tracked_kpis").insert(payload);
      closeAndRefresh();
    }

    const libByCat = KPI_DIMENSIONS.map((d) => ({ dim: d, items: available.filter((l) => l.category === d && !added.has(l.name)) })).filter((g) => g.items.length > 0);

    return (
      <Modal title={kpi ? "Modifier le KPI" : "Ajouter un KPI"} onClose={closeAndRefresh}
        footer={mode === "custom"
          ? <><button className="btn btn-ghost" onClick={closeAndRefresh}>Annuler</button><button className="btn btn-primary" disabled={busy || !name.trim()} onClick={save}>{busy ? "…" : "Enregistrer"}</button></>
          : <button className="btn btn-primary" onClick={closeAndRefresh}>Terminé{added.size > 0 ? ` (${added.size} ajouté${added.size > 1 ? "s" : ""})` : ""}</button>}>
        {!kpi && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {(["library", "ohada", "custom"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: mode === m ? "var(--espresso)" : "var(--surface)", color: mode === m ? "#fff" : "var(--text-2)", border: `1px solid ${mode === m ? "var(--espresso)" : "var(--border-strong)"}` }}>{m === "library" ? "Depuis la bibliothèque" : m === "ohada" ? "Norme OHADA" : "Personnalisé"}</button>
            ))}
          </div>
        )}

        {mode === "ohada" && !kpi ? (
          <div style={{ display: "grid", gap: 12, maxHeight: 360, overflowY: "auto" }}>
            <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.6 }}>
              Libellés du <b>plan comptable OHADA</b>, avec le poste dont ils sortent. Les ajouter garantit
              des chiffres comparables d&apos;une société à l&apos;autre — et ils sont <b>alimentés automatiquement</b>
              dès que les états financiers sont saisis.
            </div>
            {Array.from(new Set(OHADA_KPIS.map((k) => k.group))).map((group) => (
              <div key={group}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--camel)", marginBottom: 6 }}>{group}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {OHADA_KPIS.filter((k) => k.group === group).map((k) => {
                    const already = added.has(k.name) || trackedNames.has(k.name);
                    return (
                      <button key={k.name} disabled={already} onClick={() => addOhada(k)}
                        title={already ? "Déjà suivi" : `Alimenté depuis ${k.code}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999,
                          fontSize: 11.5, fontWeight: 600, cursor: already ? "default" : "pointer", opacity: already ? 0.45 : 1,
                          background: "var(--surface)", color: "var(--text-2)", border: "1px dashed var(--border-strong)" }}>
                        {already ? "✓" : "+"} {k.name}
                        <span style={{ color: "var(--text-3)", fontWeight: 500 }}>{k.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {added.size > 0 && <div style={{ fontSize: 11.5, color: "var(--green-fg)" }}>✅ {added.size} indicateur{added.size > 1 ? "s" : ""} ajouté{added.size > 1 ? "s" : ""}. Utilisez « Alimenter depuis les chiffres saisis » pour les remplir.</div>}
          </div>
        ) : mode === "library" && !kpi ? (
          available.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--text-3)", padding: "8px 0" }}>Aucun indicateur de bibliothèque disponible pour ce secteur (sous-secteur non défini, ou tous déjà suivis). Utilisez « Personnalisé ».</div>
          ) : (
            <div style={{ display: "grid", gap: 12, maxHeight: 340, overflowY: "auto" }}>
              <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>Panier du secteur — cliquez pour ajouter au suivi.</div>
              {libByCat.map((g) => (
                <div key={g.dim}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--camel)", marginBottom: 6 }}>{KPI_DIM_LABEL[g.dim] ?? g.dim}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {g.items.map((l) => (
                      <button key={l.id} onClick={() => addFromLibrary(l)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: "var(--surface)", color: "var(--text-2)", border: "1px dashed var(--border-strong)" }}>+ {l.name}</button>
                    ))}
                  </div>
                </div>
              ))}
              {added.size > 0 && <div style={{ fontSize: 11.5, color: "var(--green-fg)" }}>✅ {added.size} indicateur{added.size > 1 ? "s" : ""} ajouté{added.size > 1 ? "s" : ""}. Saisissez leurs valeurs via « Saisir une valeur ».</div>}
            </div>
          )
        ) : (
          <>
            <Field label="Nom de l'indicateur"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Chiffre d'affaires mensuel" /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Dimension"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{KPI_DIMENSIONS.map((d) => <option key={d} value={d}>{KPI_DIM_LABEL[d]}</option>)}</Select></Field>
              <Field label="Unité"><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ex : FCFA, %, clients" /></Field>
              <Field label="Cible"><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Optionnel" /></Field>
              <Field label="Sens"><Select value={direction} onChange={(e) => setDirection(e.target.value)}>{KPI_DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</Select></Field>
            </div>
          </>
        )}
      </Modal>
    );
  }

  function ValueModal({ kpi, onClose }: { kpi: KpiSeries; onClose: () => void }) {
    const [busy, setBusy] = useState(false);
    const [period, setPeriod] = useState("");
    const [value, setValue] = useState("");
    async function save() {
      if (!period.trim() || value === "") return;
      setBusy(true);
      const supabase = createClient();
      // remplace la valeur si la période existe déjà
      await supabase.from("kpi_values").delete().eq("tracked_kpi_id", kpi.id).eq("period", period.trim());
      await supabase.from("kpi_values").insert({ tracked_kpi_id: kpi.id, period: period.trim(), value: Number(value) });
      onClose(); router.refresh();
    }
    return (
      <Modal title={`Saisir une valeur — ${kpi.name}`} onClose={onClose}
        footer={<><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={busy || !period.trim() || value === ""} onClick={save}>{busy ? "…" : "Enregistrer"}</button></>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Période"><Input list="kpi-periods" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Ex : 2026-T2" /><datalist id="kpi-periods"><option value="2026-T1" /><option value="2026-T2" /><option value="2026-T3" /><option value="2026-T4" /><option value="2025" /></datalist></Field>
          <Field label={`Valeur${kpi.unit ? ` (${kpi.unit})` : ""}`}><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
        </div>
        {kpi.series.length > 0 && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Dernière : {kpi.series[kpi.series.length - 1].value} ({kpi.series[kpi.series.length - 1].period}). Saisir la même période remplace la valeur.</div>}
      </Modal>
    );
  }
}
