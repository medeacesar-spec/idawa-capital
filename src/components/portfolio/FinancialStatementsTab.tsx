"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OHADA_SECTIONS, computeOhada, bilanFonctionnel, ratios, type OhadaSection } from "@/lib/finance/ohada";
import type { StatementValues } from "@/lib/data/financialStatements";

const fmt = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("fr-FR"));
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)} %`);
const mult = (v: number | null) => (v == null ? "—" : `${v.toFixed(2)}×`);

export default function FinancialStatementsTab({ companyId, values }: { companyId: string; values: StatementValues }) {
  const router = useRouter();
  const [section, setSection] = useState<OhadaSection>("resultat");
  const [extraYears, setExtraYears] = useState<number[]>([]);

  const thisYear = new Date().getFullYear();
  let years = Array.from(new Set([...Object.keys(values).map(Number), ...extraYears]));
  for (let i = 1; years.length < 3; i++) years = Array.from(new Set([...years, thisYear - i]));
  years.sort((a, b) => a - b);

  // Valeurs complétées des totaux et soldes, par exercice.
  const computed: Record<number, Record<string, number>> = {};
  for (const y of years) computed[y] = computeOhada(values[y] ?? {});

  async function save(year: number, code: string, raw: string) {
    const clean = raw.replace(/\s/g, "").replace(",", ".");
    const amount = clean === "" ? null : Math.round(Number(clean));
    if (amount !== null && Number.isNaN(amount)) return;
    if (amount === (values[year]?.[code] ?? null)) return;
    await createClient().from("financial_statements").upsert(
      { company_id: companyId, fiscal_year: year, code, amount },
      { onConflict: "company_id,fiscal_year,code" }
    );
    router.refresh();
  }

  const lines = OHADA_SECTIONS.find((s) => s.key === section)!.lines;
  const th: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap", width: 128 };
  const inp: React.CSSProperties = { width: "100%", padding: "4px 7px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11.5, fontFamily: "inherit", textAlign: "right", outline: "none", background: "var(--surface)", color: "var(--ink)" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "inline-flex", gap: 2, background: "var(--surface-cream)", border: "1px solid var(--border)", borderRadius: 999, padding: 3 }}>
          {OHADA_SECTIONS.map((s) => {
            const on = s.key === section;
            return (
              <button key={s.key} onClick={() => setSection(s.key)}
                style={{ padding: "6px 14px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none",
                  background: on ? "var(--espresso)" : "transparent", color: on ? "#fff" : "var(--text-2)" }}>
                {s.title}
              </button>
            );
          })}
        </div>
        <button className="btn btn-primary" onClick={() => setExtraYears((e) => [...e, Math.min(...years) - 1])}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Exercice antérieur
        </button>
      </div>

      <div className="card" style={{ padding: "6px 14px", overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 340 + years.length * 130 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left", width: "auto", minWidth: 300 }}>Poste</th>
              {years.map((y) => <th key={y} style={{ ...th, color: "var(--camel)", fontSize: 11.5 }}>{y}</th>)}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const total = line.kind === "total";
              return (
                <tr key={line.code} style={{ borderTop: "1px solid var(--sep)", background: total ? "var(--surface-cream)" : undefined }}>
                  <td style={{ padding: "5px 8px", fontSize: 12, color: "var(--ink)", fontWeight: total ? 600 : 400, whiteSpace: "nowrap" }}>
                    <span style={{ color: "var(--text-3)", fontSize: 10, marginRight: 8 }}>{line.code}</span>
                    {line.label}
                  </td>
                  {years.map((y) => (
                    <td key={y} style={{ padding: "3px 6px" }}>
                      {total ? (
                        <div className="tnum" style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: line.key ? "var(--espresso)" : "var(--ink)", padding: "4px 7px" }}>
                          {fmt(computed[y][line.code])}
                        </div>
                      ) : (
                        <input key={`${line.code}${y}${values[y]?.[line.code] ?? ""}`} defaultValue={values[y]?.[line.code] ?? ""}
                          onBlur={(e) => save(y, line.code, e.target.value)} style={inp} inputMode="numeric" />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Analyse dérivée */}
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: "18px 0 8px" }}>Analyse financière <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— calculée à partir des états saisis</span></div>
      <div className="card" style={{ padding: "6px 14px", overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 340 + years.length * 130 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left", width: "auto", minWidth: 300 }}>Indicateur</th>
              {years.map((y) => <th key={y} style={{ ...th, color: "var(--camel)", fontSize: 11.5 }}>{y}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              { k: "Fonds de roulement (FR)", f: (y: number) => fmt(bilanFonctionnel(computed[y]).fondsRoulement) },
              { k: "Besoin en fonds de roulement (BFR)", f: (y: number) => fmt(bilanFonctionnel(computed[y]).bfr) },
              { k: "Trésorerie nette", f: (y: number) => fmt(bilanFonctionnel(computed[y]).tresorerieNette) },
              { k: "Marge d'EBE (EBE / CA)", f: (y: number) => pct(ratios(computed[y]).margeEbe) },
              { k: "Marge nette (RN / CA)", f: (y: number) => pct(ratios(computed[y]).margeNette) },
              { k: "Rentabilité des capitaux propres (ROE)", f: (y: number) => pct(ratios(computed[y]).roe) },
              { k: "Autonomie financière (CP / total bilan)", f: (y: number) => pct(ratios(computed[y]).autonomie) },
              { k: "Endettement (dettes fin. / CP)", f: (y: number) => mult(ratios(computed[y]).endettement) },
              { k: "Liquidité générale (AC / PC)", f: (y: number) => mult(ratios(computed[y]).liquiditeGenerale) },
            ].map((row) => (
              <tr key={row.k} style={{ borderTop: "1px solid var(--sep)" }}>
                <td style={{ padding: "5px 8px", fontSize: 12, color: "var(--ink)" }}>{row.k}</td>
                {years.map((y) => (
                  <td key={y} className="tnum" style={{ padding: "5px 8px", fontSize: 12, textAlign: "right", color: "var(--ink)" }}>{row.f(y)}</td>
                ))}
              </tr>
            ))}
            <tr style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "5px 8px", fontSize: 12, color: "var(--text-2)" }}>Équilibre du bilan (Actif − Passif)</td>
              {years.map((y) => {
                const e = ratios(computed[y]).equilibre;
                const ok = Math.abs(e) < 1;
                return (
                  <td key={y} className="tnum" style={{ padding: "5px 8px", fontSize: 12, textAlign: "right", fontWeight: 600, color: ok ? "var(--green-fg)" : "var(--red-fg)" }}>
                    {ok ? "équilibré" : fmt(e)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 8 }}>
        Montants en FCFA. Les charges se saisissent en positif. Les lignes en fond crème (totaux, marge, valeur ajoutée, EBE, résultats) sont <b>calculées automatiquement</b>.
      </div>
    </div>
  );
}
