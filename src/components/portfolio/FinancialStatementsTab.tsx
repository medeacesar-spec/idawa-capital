"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OHADA_SECTIONS, computeOhada, bilanFonctionnel, ratios, type OhadaSection } from "@/lib/finance/ohada";
import type { StatementValues } from "@/lib/data/financialStatements";
import { useYearWindow, YearNav, YEAR_WINDOW } from "./YearWindow";
import OhadaImportModal from "./OhadaImportModal";
import { useCanEdit } from "@/components/shared/WriteAccess";

const fmt = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("fr-FR"));
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)} %`);
const mult = (v: number | null) => (v == null ? "—" : `${v.toFixed(2)}×`);

export default function FinancialStatementsTab({ companyId, values }: { companyId: string; values: StatementValues }) {
  const router = useRouter();
  const [section, setSection] = useState<OhadaSection>("resultat");
  const saved = Object.keys(values).map(Number);
  // Le remplissage initial (pour toujours proposer au moins YEAR_WINDOW colonnes) est calculé
  // UNE SEULE FOIS et rangé dans extraYears. Sinon il se recalculait à chaque rendu et un
  // exercice ajouté à la main faisait disparaître un exercice de remplissage.
  const [extraYears, setExtraYears] = useState<number[]>(() => {
    const pad: number[] = [];
    let y = saved.length ? Math.max(...saved) : new Date().getFullYear();
    while (saved.length + pad.length < YEAR_WINDOW) {
      if (!saved.includes(y)) pad.push(y);
      y--;
    }
    return pad;
  });
  const [hiddenYears, setHiddenYears] = useState<number[]>([]);
  const canEdit = useCanEdit();
  const [importOpen, setImportOpen] = useState(false);

  // Les exercices les plus récents s'affichent en premier.
  const allYears = Array.from(new Set([...saved, ...extraYears]))
    .filter((y) => !hiddenYears.includes(y))
    .sort((a, b) => b - a);

  // Toutes les années sont conservées ; la fenêtre en montre quelques-unes à la fois.
  const win = useYearWindow(allYears, "start");
  const years = win.visible;

  // Retirer une colonne ne supprime rien en base : l'exercice disparaît seulement de l'écran.
  function hideYear(y: number) {
    setHiddenYears((h) => [...h, y]);
    setExtraYears((e) => e.filter((x) => x !== y));
  }
  function addYear(delta: 1 | -1) {
    const next = (delta === 1 ? Math.max(...allYears) : Math.min(...allYears)) + delta;
    const updated = Array.from(new Set([...allYears, next])).sort((a, b) => b - a);
    setHiddenYears((h) => h.filter((x) => x !== next));
    setExtraYears((e) => (e.includes(next) ? e : [...e, next]));
    win.reveal(updated.indexOf(next), updated.length); // faire défiler jusqu'au nouvel exercice
  }

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
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <YearNav win={win} />
          {canEdit && (<button className="btn" onClick={() => setImportOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 4 5-4" /><path d="M5 21h14" /></svg>
            Importer
          </button>)}
          <button className="btn" onClick={() => addYear(1)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Exercice postérieur
          </button>
          <button className="btn btn-primary" onClick={() => addYear(-1)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Exercice antérieur
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: "6px 14px", overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 340 + years.length * 130 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left", width: "auto", minWidth: 300 }}>Poste</th>
              {years.map((y) => (
                <th key={y} style={{ ...th, color: "var(--camel)", fontSize: 11.5 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {y}
                    {allYears.length > 1 && (
                      <button onClick={() => hideYear(y)} title={`Retirer l'exercice ${y} de l'affichage`} aria-label={`Retirer l'exercice ${y}`}
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-3)", padding: 0, lineHeight: 1, display: "flex" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                      </button>
                    )}
                  </span>
                </th>
              ))}
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
                          onBlur={(e) => save(y, line.code, e.target.value)} style={inp} inputMode="numeric"
                          readOnly={!canEdit} disabled={!canEdit} />
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
        <br />
        Les exercices s&apos;affichent {YEAR_WINDOW} à la fois, du plus récent au plus ancien : les flèches font défiler, la croix retire une colonne de l&apos;écran. <b>Aucun exercice n&apos;est perdu</b> — ajoutez-en autant que nécessaire.
      </div>

      {importOpen && <OhadaImportModal companyId={companyId} years={allYears} onClose={() => setImportOpen(false)} />}
    </div>
  );
}
