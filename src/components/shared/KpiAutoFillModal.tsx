"use client";

// Reprise des KPIs financiers depuis les états financiers OHADA déjà saisis.
// Comme pour l'import, rien n'est écrit sans que l'utilisateur ait vu, ligne par ligne,
// ce qui va l'être et d'où le chiffre provient.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { derive, type DerivedValue } from "@/lib/finance/kpiSources";
import type { KpiSeries } from "@/lib/data/kpis";

type Candidate = { kpi: KpiSeries; values: DerivedValue[] };

const fmtVal = (v: number, unit: string) =>
  unit === "FCFA" ? Math.round(v).toLocaleString("fr-FR") : unit === "%" ? `${v.toFixed(1)} %` : `${v.toFixed(2)} ×`;

export default function KpiAutoFillModal({
  kpis, statements, onClose,
}: {
  kpis: KpiSeries[];
  statements: Record<number, Record<string, number>>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const candidates: Candidate[] = useMemo(
    () => kpis.map((k) => ({ kpi: k, values: derive(k.name, statements) })).filter((c) => c.values.length > 0),
    [kpis, statements]
  );

  // Une valeur déjà saisie pour la même période sera remplacée : il faut le dire.
  const existingOf = (k: KpiSeries, year: number) => k.series.find((s) => s.period === String(year))?.value ?? null;

  const retained = candidates.filter((c) => !skipped.has(c.kpi.id));
  const writes = retained.reduce((a, c) => a + c.values.length, 0);

  async function apply() {
    setBusy(true);
    setError(null);
    const payload = retained.flatMap((c) =>
      c.values.map((v) => ({ tracked_kpi_id: c.kpi.id, period: String(v.year), value: v.value }))
    );
    const { error: err } = await createClient()
      .from("kpi_values")
      .upsert(payload, { onConflict: "tracked_kpi_id,period" });
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
    onClose();
  }

  const th: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "5px 8px", fontSize: 11.5, color: "var(--ink)" };

  return (
    <Modal
      title="Alimenter les KPIs depuis les états financiers"
      onClose={onClose}
      maxWidth={760}
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>
            <b>{writes}</b> valeur{writes > 1 ? "s" : ""} sur <b>{retained.length}</b> KPI{retained.length > 1 ? "s" : ""}
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={apply} disabled={busy || writes === 0}>
              {busy ? "Enregistrement…" : "Reprendre ces valeurs"}
            </button>
          </span>
        </div>
      }
    >
      <div style={{ padding: "14px 20px" }}>
        {candidates.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6 }}>
            Aucun KPI suivi ne correspond à un poste des états financiers, ou aucun exercice n&apos;est encore saisi.
            Renseignez l&apos;onglet <b>États financiers</b>, puis suivez des KPIs financiers comme « Chiffre d&apos;affaires »,
            « EBE », « Résultat net », « BFR » ou « Marge nette ».
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 12 }}>
              Ces KPIs se déduisent des états financiers déjà saisis : les reprendre ici évite une double saisie
              et garantit un chiffre unique. Vérifiez l&apos;origine de chaque valeur avant d&apos;enregistrer.
            </div>
            <div style={{ maxHeight: "50vh", overflowY: "auto", border: "1px solid var(--border)", borderRadius: 9 }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr style={{ position: "sticky", top: 0, background: "var(--surface-cream)" }}>
                    <th style={th}>KPI suivi</th>
                    <th style={th}>Origine du chiffre</th>
                    <th style={{ ...th, textAlign: "right" }}>Valeurs par exercice</th>
                    <th style={{ ...th, width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => {
                    const off = skipped.has(c.kpi.id);
                    return (
                      <tr key={c.kpi.id} style={{ borderTop: "1px solid var(--sep)", opacity: off ? 0.4 : 1 }}>
                        <td style={{ ...td, fontWeight: 600 }}>{c.kpi.name}</td>
                        <td style={{ ...td, color: "var(--text-3)", fontSize: 11 }}>{c.values[0].origin}</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          {c.values.map((v) => {
                            const prev = existingOf(c.kpi, v.year);
                            const replaced = prev != null && Math.abs(prev - v.value) > 0.01;
                            return (
                              <div key={v.year} className="tnum" style={{ whiteSpace: "nowrap" }}>
                                <span style={{ color: "var(--text-3)", fontSize: 10.5, marginRight: 6 }}>{v.year}</span>
                                <b>{fmtVal(v.value, v.unit)}</b>
                                {replaced && (
                                  <span style={{ color: "var(--amber-fg)", fontSize: 10, marginLeft: 6 }}>
                                    remplace {fmtVal(prev, v.unit)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </td>
                        <td style={{ padding: "3px 4px", textAlign: "center" }}>
                          <button
                            onClick={() => setSkipped((s) => { const n = new Set(s); if (n.has(c.kpi.id)) n.delete(c.kpi.id); else n.add(c.kpi.id); return n; })}
                            title={off ? "Réintégrer ce KPI" : "Laisser ce KPI en saisie manuelle"}
                            style={{ border: "none", background: "transparent", cursor: "pointer", color: off ? "var(--camel)" : "var(--text-3)", padding: 2, display: "flex" }}>
                            {off
                              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 10, lineHeight: 1.6 }}>
              La période enregistrée est l&apos;<b>exercice</b> (annuel). Une valeur déjà saisie pour le même exercice est <b>remplacée</b> —
              signalé en ambre ci-dessus. Les KPIs laissés de côté par la croix restent en saisie manuelle.
            </div>
          </>
        )}
        {error && <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--red-fg)" }}>Échec de l&apos;enregistrement : {error}</div>}
      </div>
    </Modal>
  );
}
