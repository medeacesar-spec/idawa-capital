"use client";

// Saisie des indicateurs de portée « programme », trimestre par trimestre.
//
// Ces valeurs n'avaient nulle part où être saisies : le tableau de bord affichait des
// chiffres qu'aucun écran ne permettait d'alimenter. On ne saisit ici que ce qui n'a de
// sens qu'au niveau du programme — budget, taux d'exécution, pourcentages. Tout ce qui se
// compte par entreprise se saisit sur la fiche de chaque entreprise et s'additionne seul.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { currentPeriod, previousPeriod, nextPeriod } from "@/lib/periods";
import type { ProgramIndicator } from "@/lib/data/params";

const PERIODS_SHOWN = 4;
const nf = (v: number | null) => (v == null ? "" : new Intl.NumberFormat("fr-FR").format(v));

export default function ProgramIndicatorValues({ indicators }: { indicators: ProgramIndicator[] }) {
  const router = useRouter();
  const supabase = createClient();

  const own = indicators.filter((i) => i.scope === "programme");
  const aggregated = indicators.filter((i) => i.scope !== "programme");

  const known = own.flatMap((i) => i.values.map((v) => v.period)).sort((a, b) => b.localeCompare(a));
  const [anchor, setAnchor] = useState<string>(known[0] ?? currentPeriod());
  const periods: string[] = [];
  for (let p = anchor, k = 0; k < PERIODS_SHOWN; k++, p = previousPeriod(p)) periods.push(p);

  const valueOf = (ind: ProgramIndicator, period: string) =>
    ind.values.find((v) => v.period === period)?.value ?? null;

  async function save(ind: ProgramIndicator, period: string, raw: string) {
    const clean = raw.replace(/\s/g, "").replace(",", ".");
    const value = clean === "" ? null : Number(clean);
    if (value !== null && Number.isNaN(value)) return;
    if (value === valueOf(ind, period)) return;
    await supabase.from("program_indicator_values").upsert(
      { program_indicator_id: ind.id, period, value },
      { onConflict: "program_indicator_id,period" }
    );
    router.refresh();
  }

  if (own.length === 0 && aggregated.length === 0) return null;

  const th: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap", width: 104 };
  const inp: React.CSSProperties = { width: "100%", padding: "5px 7px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 12, fontFamily: "inherit", textAlign: "right", outline: "none", background: "var(--surface)", color: "var(--ink)" };

  return (
    <section className="card" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Suivi des indicateurs</div>
          <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 2 }}>Ce qui ne se compte qu&apos;au niveau du programme, trimestre par trimestre.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" onClick={() => setAnchor(previousPeriod(anchor))} title="Trimestres précédents">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <span style={{ fontSize: 11.5, color: "var(--text-2)", whiteSpace: "nowrap" }}>{periods[periods.length - 1]} → {periods[0]}</span>
          <button className="btn" onClick={() => setAnchor(nextPeriod(anchor))} title="Trimestres suivants">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {own.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-3)", padding: "10px 0" }}>
          Aucun indicateur de portée « programme » sélectionné.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 280 + periods.length * 110 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left", width: "auto", minWidth: 230 }}>Indicateur</th>
                {periods.map((p) => <th key={p} style={{ ...th, color: "var(--camel)", fontSize: 11.5 }}>{p.replace("-", " ")}</th>)}
                <th style={{ ...th, borderLeft: "1px solid var(--border)" }}>Cible</th>
              </tr>
            </thead>
            <tbody>
              {own.map((ind) => (
                <tr key={ind.id} style={{ borderTop: "1px solid var(--sep)" }}>
                  <td style={{ padding: "5px 8px", fontSize: 12, color: "var(--ink)" }}>
                    {ind.name}
                    {ind.unit && <span style={{ color: "var(--text-3)", fontSize: 10.5, marginLeft: 6 }}>{ind.unit}</span>}
                  </td>
                  {periods.map((p) => {
                    const v = valueOf(ind, p);
                    return (
                      <td key={p} style={{ padding: "4px 6px", width: 104 }}>
                        <input key={`${ind.id}${p}${v ?? ""}`} defaultValue={v ?? ""} placeholder="—"
                          onBlur={(e) => save(ind, p, e.target.value)} style={inp} inputMode="decimal" />
                      </td>
                    );
                  })}
                  <td className="tnum" style={{ padding: "5px 8px", fontSize: 12, textAlign: "right", color: "var(--text-2)", borderLeft: "1px solid var(--border)" }}>
                    {nf(ind.target) || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aggregated.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--sep)", fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
          <b>{aggregated.length} indicateur{aggregated.length > 1 ? "s" : ""}</b> ne {aggregated.length > 1 ? "se saisissent" : "se saisit"} pas ici :
          {" "}{aggregated.map((i) => i.name).join(", ")}.
          {aggregated.length > 1 ? " Ils se comptent" : " Il se compte"} entreprise par entreprise, sur la fiche de chacune,
          et le total du programme s&apos;en déduit — le saisir ici créerait un second chiffre qui finirait par diverger.
        </div>
      )}
    </section>
  );
}
