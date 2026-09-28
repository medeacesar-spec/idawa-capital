"use client";

// Chiffres clés par exercice (CA, EBE, résultat net, effectif), tels que DÉCLARÉS par une
// source : promoteur, PAEB, diagnostic… C'est ce dont on dispose au sourcing, bien avant la
// liasse. Quand la liasse OHADA de l'exercice est saisie, on la met en regard : le chiffre
// déclaré n'est jamais recopié dans la liasse ni l'inverse, on RECOUPE et on montre l'écart.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { computeOhada } from "@/lib/finance/ohada";
import type { FinEntity, KeyFigure, StatementValues } from "@/lib/data/financialStatements";
import { useCanEdit } from "@/components/shared/WriteAccess";

const SOURCES = ["Déclaré par le promoteur", "États financiers", "PAEB (ADPME)", "IDERA", "Diagnostic 360°", "Business plan"];
const GAP_ALERT = 0.05; // au-delà de 5 % d'écart, le chiffre déclaré est signalé

type Metric = { key: "revenue" | "ebitda" | "netIncome"; col: string; label: string; ohada: string };
const METRICS: Metric[] = [
  { key: "revenue", col: "revenue", label: "Chiffre d'affaires", ohada: "XB" },
  { key: "ebitda", col: "ebitda", label: "EBE", ohada: "XD" },
  { key: "netIncome", col: "net_income", label: "Résultat net", ohada: "XI" },
];

const fmt = (v: number | null | undefined) => (v == null ? "" : Math.round(v).toLocaleString("fr-FR"));

// « 283 400 000 », « 12,261,850 », « 283,4 M », « 1,2 Md » → montant en FCFA.
// Vide → null ; illisible → undefined.
export function parseMoney(raw: string): number | null | undefined {
  const t = raw.replace(/[\s  ]/g, "").replace(/f\s*cfa$|f$/i, "");
  if (t === "") return null;
  const m = t.match(/^(-?[\d.,]+)(mds|md|m)?$/i);
  if (!m) return undefined;
  const unit = (m[2] ?? "").toLowerCase();
  let s = m[1];
  if (unit) {
    s = s.replace(",", ".");                      // « 283,4 M » : la virgule est décimale
  } else {
    s = s.replace(/\./g, "");                     // sans unité, le point sépare les milliers
    s = (s.match(/,/g) ?? []).length > 1 ? s.replace(/,/g, "") : s.replace(",", ".");
  }
  let n = Number(s);
  if (Number.isNaN(n)) return undefined;
  if (unit === "m") n *= 1e6;
  if (unit.startsWith("md")) n *= 1e9;
  return Math.round(n);
}

export default function KeyFiguresPanel({ entity, figures, liasse }: { entity: FinEntity; figures: KeyFigure[]; liasse: StatementValues }) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [extra, setExtra] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const byYear = new Map(figures.map((f) => [f.fiscalYear, f]));
  const liasseYears = Object.keys(liasse).map(Number).filter((y) => Object.keys(liasse[y] ?? {}).length > 0);
  const years = Array.from(new Set([...figures.map((f) => f.fiscalYear), ...liasseYears, ...extra])).sort((a, b) => b - a);
  const computed: Record<number, Record<string, number>> = {};
  for (const y of liasseYears) computed[y] = computeOhada(liasse[y]);

  const nextYear = years.length ? Math.min(...years) - 1 : new Date().getFullYear() - 1;
  const [newYear, setNewYear] = useState(String(nextYear));

  async function save(year: number, patch: Record<string, unknown>) {
    setError(null);
    const { error: err } = await createClient().from("key_figures").upsert(
      { entity_type: entity.type, entity_id: entity.id, fiscal_year: year, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "entity_type,entity_id,fiscal_year" }
    );
    if (err) { setError(err.message); return; }
    router.refresh();
  }
  function saveMoney(year: number, m: Metric, raw: string) {
    const v = parseMoney(raw);
    if (v === undefined) { setError(`« ${raw} » n'est pas un montant lisible (ex. 283 400 000 ou 283,4 M).`); return; }
    if (v === (byYear.get(year)?.[m.key] ?? null)) return;
    save(year, { [m.col]: v });
  }
  function saveEmployees(year: number, raw: string) {
    const t = raw.replace(/\s/g, "");
    const v = t === "" ? null : Math.round(Number(t));
    if (v !== null && Number.isNaN(v)) { setError(`« ${raw} » n'est pas un effectif lisible.`); return; }
    if (v === (byYear.get(year)?.employees ?? null)) return;
    save(year, { employees: v });
  }
  async function removeYear(year: number) {
    if (!byYear.has(year)) { setExtra((e) => e.filter((x) => x !== year)); return; }
    if (!confirm(`Supprimer les chiffres clés déclarés pour ${year} ? (La liasse OHADA, si elle existe, n'est pas touchée.)`)) return;
    await createClient().from("key_figures").delete().eq("entity_type", entity.type).eq("entity_id", entity.id).eq("fiscal_year", year);
    setExtra((e) => e.filter((x) => x !== year));
    router.refresh();
  }
  function addYear() {
    const y = parseInt(newYear, 10);
    if (Number.isNaN(y) || y < 1950 || y > 2100) return;
    if (!years.includes(y)) setExtra((e) => [...e, y]);
    setNewYear(String(Math.min(y, ...years) - 1));
  }

  const th: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" };
  const inp: React.CSSProperties = { width: "100%", minWidth: 110, padding: "4px 7px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11.5, fontFamily: "inherit", textAlign: "right", outline: "none", background: "var(--surface)", color: "var(--ink)" };

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          Chiffres clés <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— déclarés par exercice, recoupés avec la liasse quand elle existe</span>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input value={newYear} onChange={(e) => setNewYear(e.target.value)} inputMode="numeric" aria-label="Exercice à ajouter"
              style={{ width: 70, padding: "6px 8px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", textAlign: "center", outline: "none" }} />
            <button className="btn" onClick={addYear}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Exercice
            </button>
          </div>
        )}
      </div>

      {years.length === 0 ? (
        <div className="card" style={{ padding: 22, textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>
          Aucun chiffre clé. Ajoutez un exercice pour saisir le CA, l&rsquo;EBE, le résultat net et l&rsquo;effectif déclarés.
        </div>
      ) : (
        <div className="card" style={{ padding: "6px 14px", overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left" }}>Exercice</th>
                {METRICS.map((m) => <th key={m.key} style={th}>{m.label}</th>)}
                <th style={th}>Effectif</th>
                <th style={{ ...th, textAlign: "left" }}>Source</th>
                <th style={{ ...th, width: 28 }} />
              </tr>
            </thead>
            <tbody>
              {years.map((y) => {
                const f = byYear.get(y);
                const liasseY = computed[y];
                return (
                  <tr key={y} style={{ borderTop: "1px solid var(--sep)", verticalAlign: "top" }}>
                    <td style={{ padding: "8px 8px", fontSize: 12.5, fontWeight: 600, color: "var(--camel)" }}>{y}</td>
                    {METRICS.map((m) => {
                      const declared = f?.[m.key] ?? null;
                      const ref = liasseY ? liasseY[m.ohada] ?? null : null;
                      const gap = declared != null && ref != null && ref !== 0 ? (declared - ref) / Math.abs(ref) : null;
                      return (
                        <td key={m.key} style={{ padding: "4px 6px" }}>
                          <input key={`${m.key}${y}${declared ?? ""}`} defaultValue={fmt(declared)} onBlur={(e) => saveMoney(y, m, e.target.value)}
                            style={inp} inputMode="decimal" readOnly={!canEdit} disabled={!canEdit} placeholder={ref != null ? "—" : ""} />
                          {ref != null && (
                            <div className="tnum" style={{ fontSize: 10, color: "var(--text-3)", textAlign: "right", marginTop: 3 }}>
                              liasse : {fmt(ref)}
                              {gap != null && (Math.abs(gap) >= GAP_ALERT
                                ? <span style={{ marginLeft: 5, color: "var(--amber-fg)", fontWeight: 600 }}>écart {gap > 0 ? "+" : "−"}{(Math.abs(gap) * 100).toFixed(0)} %</span>
                                : <span style={{ marginLeft: 5, color: "var(--green-fg)" }}>✓</span>)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ padding: "4px 6px" }}>
                      <input key={`emp${y}${f?.employees ?? ""}`} defaultValue={f?.employees ?? ""} onBlur={(e) => saveEmployees(y, e.target.value)}
                        style={{ ...inp, minWidth: 60 }} inputMode="numeric" readOnly={!canEdit} disabled={!canEdit} />
                    </td>
                    <td style={{ padding: "4px 6px" }}>
                      <input key={`src${y}${f?.source ?? ""}`} defaultValue={f?.source ?? ""} list="key-figure-sources"
                        onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== (f?.source ?? null)) save(y, { source: v }); }}
                        style={{ ...inp, textAlign: "left", minWidth: 150 }} readOnly={!canEdit} disabled={!canEdit} placeholder="Source…" />
                    </td>
                    <td style={{ padding: "6px 2px" }}>
                      {canEdit && (f || extra.includes(y)) && (
                        <button onClick={() => removeYear(y)} title="Supprimer ces chiffres clés" aria-label={`Supprimer les chiffres clés ${y}`}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-3)", padding: 2, display: "flex" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <datalist id="key-figure-sources">{SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
      )}
      {error && <div style={{ fontSize: 11.5, color: "var(--red-fg)", marginTop: 6 }}>{error}</div>}
      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 6 }}>
        Montants en FCFA — on peut saisir « 283 400 000 » ou « 283,4 M ». Sous chaque chiffre, la valeur <b>calculée depuis la liasse</b> du même exercice ; un écart de plus de 5 % est signalé.
      </div>
    </div>
  );
}
