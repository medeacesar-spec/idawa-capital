"use client";

// Accompagnement d'une entreprise accélérée : ce que le fonds a fait POUR ELLE,
// trimestre après trimestre.
//
// Les indicateurs viennent du catalogue du programme ; seuls ceux de portée « entreprise »
// se saisissent ici. Les moyens financiers et les pourcentages restent au niveau du
// programme, où ils ont un sens — additionner des pourcentages n'en aurait aucun.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCanEdit } from "@/components/shared/WriteAccess";
import { currentPeriod, previousPeriod, nextPeriod } from "@/lib/periods";
import type { CompanySupport } from "@/lib/data/companySupport";

const nf = (v: number | null) => (v == null ? "" : new Intl.NumberFormat("fr-FR").format(v));
const PERIODS_SHOWN = 4;

export default function SupportTab({ companyId, data }: { companyId: string; data: CompanySupport }) {
  const router = useRouter();
  const canEdit = useCanEdit();

  // Quatre trimestres glissants à partir du plus récent renseigné, ou du trimestre courant.
  const [anchor, setAnchor] = useState<string>(data.periods[0] ?? currentPeriod());
  const periods: string[] = [];
  for (let p = anchor, i = 0; i < PERIODS_SHOWN; i++, p = previousPeriod(p)) periods.push(p);

  const valueOf = (indicatorId: string, period: string) =>
    data.values.find((v) => v.indicatorId === indicatorId && v.period === period)?.value ?? null;

  async function save(indicatorId: string, period: string, raw: string) {
    const clean = raw.replace(/\s/g, "").replace(",", ".");
    const value = clean === "" ? null : Number(clean);
    if (value !== null && Number.isNaN(value)) return;
    if (value === valueOf(indicatorId, period)) return;
    await createClient().from("company_indicator_values").upsert(
      { company_id: companyId, program_indicator_id: indicatorId, period, value },
      { onConflict: "company_id,program_indicator_id,period" }
    );
    router.refresh();
  }

  if (!data.programId) {
    return (
      <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>
        Cette entreprise n&apos;est rattachée à aucun programme. Rattachez-la pour suivre son accompagnement.
      </div>
    );
  }
  if (data.indicators.length === 0) {
    return (
      <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>
        Aucun indicateur d&apos;accompagnement au niveau entreprise pour le programme <b>{data.programName}</b>.
        Ajoutez-en dans <b>Paramètres du fonds → {data.programName}</b>.
      </div>
    );
  }

  const categories = Array.from(new Set(data.indicators.map((i) => i.category)));
  const th: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap", width: 104 };
  const inp: React.CSSProperties = { width: "100%", padding: "5px 7px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 12, fontFamily: "inherit", textAlign: "right", outline: "none", background: "var(--surface)", color: "var(--ink)" };

  // Cumul sur les trimestres affichés : c'est ce que l'entreprise a reçu sur la période.
  const totalOf = (indicatorId: string) =>
    periods.reduce((a, p) => a + (valueOf(indicatorId, p) ?? 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          Accompagnement <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— programme {data.programName}, saisie trimestrielle</span>
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

      <div className="card" style={{ padding: "6px 14px", overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 300 + periods.length * 110 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left", width: "auto", minWidth: 240 }}>Indicateur</th>
              {periods.map((p) => <th key={p} style={{ ...th, color: "var(--camel)", fontSize: 11.5 }}>{p.replace("-", " ")}</th>)}
              <th style={{ ...th, borderLeft: "1px solid var(--border)" }}>Cumul</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <>
                <tr key={cat}>
                  <td colSpan={periods.length + 2} style={{ padding: "9px 8px 4px", fontSize: 11, fontWeight: 700, color: "var(--camel)", textTransform: "uppercase", letterSpacing: ".04em" }}>{cat}</td>
                </tr>
                {data.indicators.filter((i) => i.category === cat).map((ind) => (
                  <tr key={ind.id} style={{ borderTop: "1px solid var(--sep)" }}>
                    <td style={{ padding: "5px 8px", fontSize: 12, color: "var(--ink)" }}>
                      {ind.name}
                      {ind.unit && <span style={{ color: "var(--text-3)", fontSize: 10.5, marginLeft: 6 }}>{ind.unit}</span>}
                    </td>
                    {periods.map((p) => {
                      const v = valueOf(ind.id, p);
                      return (
                        <td key={p} style={{ padding: "4px 6px", width: 104 }}>
                          <input key={`${ind.id}${p}${v ?? ""}`} defaultValue={v ?? ""} placeholder="—"
                            onBlur={(e) => save(ind.id, p, e.target.value)} style={inp} inputMode="decimal"
                            readOnly={!canEdit} disabled={!canEdit} />
                        </td>
                      );
                    })}
                    <td className="tnum" style={{ padding: "5px 8px", fontSize: 12, textAlign: "right", fontWeight: 600, color: "var(--ink)", borderLeft: "1px solid var(--border)" }}>
                      {nf(totalOf(ind.id)) || "—"}
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 8, lineHeight: 1.6 }}>
        Saisie enregistrée en quittant la case. Ces valeurs <b>s&apos;additionnent au niveau du programme</b> : ce que vous entrez ici
        alimente les totaux du tableau de bord, sans double compte.
        Les moyens financiers et les pourcentages (budget, taux d&apos;exécution, part de femmes) se suivent au niveau du programme,
        dans <b>Paramètres du fonds</b> — les additionner par entreprise n&apos;aurait pas de sens.
      </div>
    </div>
  );
}
