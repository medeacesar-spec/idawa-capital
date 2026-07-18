"use client";

// Reprise des KPIs financiers depuis les états financiers OHADA déjà saisis.
// Comme pour l'import, rien n'est écrit sans que l'utilisateur ait vu, ligne par ligne,
// ce qui va l'être et d'où le chiffre provient.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { derive, budgetTarget, type DerivedValue, type BudgetRow } from "@/lib/finance/kpiSources";
import type { KpiSeries } from "@/lib/data/kpis";

type Candidate = { kpi: KpiSeries; values: DerivedValue[]; target: { year: number; value: number } | null };

const fmtVal = (v: number, unit: string) =>
  unit === "FCFA" ? Math.round(v).toLocaleString("fr-FR") : unit === "%" ? `${v.toFixed(1)} %` : `${v.toFixed(2)} ×`;

export default function KpiAutoFillModal({
  kpis, statements, budget = [], onClose,
}: {
  kpis: KpiSeries[];
  statements: Record<number, Record<string, number>>;
  budget?: BudgetRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [withTargets, setWithTargets] = useState(true);

  const candidates: Candidate[] = useMemo(
    () => kpis
      .map((k) => ({ kpi: k, values: derive(k.name, statements, budget), target: budgetTarget(k.name, budget) }))
      .filter((c) => c.values.length > 0 || c.target != null),
    [kpis, statements, budget]
  );

  // Une valeur déjà saisie pour la même période sera remplacée : il faut le dire.
  const existingOf = (k: KpiSeries, year: number) => k.series.find((s) => s.period === String(year))?.value ?? null;

  const retained = candidates.filter((c) => !skipped.has(c.kpi.id));
  const writes = retained.reduce((a, c) => a + c.values.length, 0);
  const targets = withTargets ? retained.filter((c) => c.target).length : 0;

  async function apply() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const payload = retained.flatMap((c) =>
      c.values.map((v) => ({ tracked_kpi_id: c.kpi.id, period: String(v.year), value: v.value }))
    );
    if (payload.length > 0) {
      const { error: err } = await supabase.from("kpi_values").upsert(payload, { onConflict: "tracked_kpi_id,period" });
      if (err) { setBusy(false); setError(err.message); return; }
    }
    // La cible se met à jour KPI par KPI : elle vit sur la fiche du KPI, pas dans la série.
    if (withTargets) {
      for (const c of retained.filter((x) => x.target)) {
        const { error: err } = await supabase.from("tracked_kpis").update({ target: c.target!.value }).eq("id", c.kpi.id);
        if (err) { setBusy(false); setError(err.message); return; }
      }
    }
    setBusy(false);
    router.refresh();
    onClose();
  }

  const th: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "5px 8px", fontSize: 11.5, color: "var(--ink)" };

  return (
    <Modal
      title="Alimenter les KPIs depuis les chiffres déjà saisis"
      onClose={onClose}
      maxWidth={860}
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>
            <b>{writes}</b> valeur{writes > 1 ? "s" : ""} sur <b>{retained.length}</b> KPI{retained.length > 1 ? "s" : ""}
            {targets > 0 && <> · <b>{targets}</b> cible{targets > 1 ? "s" : ""} mise{targets > 1 ? "s" : ""} à jour</>}
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={apply} disabled={busy || (writes === 0 && targets === 0)}>
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
            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 10 }}>
              Ces KPIs se déduisent de chiffres déjà saisis : les reprendre ici évite une double saisie
              et garantit un chiffre unique. Les <b>états financiers</b> font foi ; la grille <b>Budget &amp; BP</b>
              ne comble que les exercices qu&apos;ils ne couvrent pas. Vérifiez l&apos;origine de chaque valeur avant d&apos;enregistrer.
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--text-2)", marginBottom: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={withTargets} onChange={(e) => setWithTargets(e.target.checked)} />
              Reprendre aussi les <b>cibles</b> depuis la colonne Budget — le budget est l&apos;objectif, le ressaisir serait une troisième saisie
            </label>
            <div style={{ maxHeight: "50vh", overflowY: "auto", border: "1px solid var(--border)", borderRadius: 9 }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr style={{ position: "sticky", top: 0, background: "var(--surface-cream)" }}>
                    <th style={th}>KPI suivi</th>
                    <th style={th}>Origine du chiffre</th>
                    <th style={{ ...th, textAlign: "right" }}>Valeurs par exercice</th>
                    <th style={{ ...th, textAlign: "right" }}>Cible (budget)</th>
                    <th style={{ ...th, width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => {
                    const off = skipped.has(c.kpi.id);
                    return (
                      <tr key={c.kpi.id} style={{ borderTop: "1px solid var(--sep)", opacity: off ? 0.4 : 1 }}>
                        <td style={{ ...td, fontWeight: 600 }}>{c.kpi.name}</td>
                        <td style={{ ...td, color: "var(--text-3)", fontSize: 11 }}>
                          {c.values[0]?.origin ?? "Grille Budget & BP, colonne Budget"}
                        </td>
                        <td style={{ ...td, textAlign: "right" }}>
                          {c.values.map((v) => {
                            const prev = existingOf(c.kpi, v.year);
                            const replaced = prev != null && Math.abs(prev - v.value) > 0.01;
                            return (
                              <div key={v.year} className="tnum" style={{ whiteSpace: "nowrap" }}>
                                <span style={{ color: "var(--text-3)", fontSize: 10.5, marginRight: 6 }}>{v.year}</span>
                                <b>{fmtVal(v.value, v.unit)}</b>
                                {v.source === "Budget & BP — réalisé" && (
                                  <span style={{ color: "var(--camel)", fontSize: 9.5, marginLeft: 5 }} title="Repris du réalisé de la grille Budget & BP, faute d'états financiers pour cet exercice">budget</span>
                                )}
                                {replaced && (
                                  <span style={{ color: "var(--amber-fg)", fontSize: 10, marginLeft: 6 }}>
                                    remplace {fmtVal(prev, v.unit)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </td>
                        <td style={{ ...td, textAlign: "right" }} className="tnum">
                          {c.target
                            ? <><b>{fmtVal(c.target.value, c.values[0]?.unit ?? "FCFA")}</b><span style={{ color: "var(--text-3)", fontSize: 10, marginLeft: 5 }}>{c.target.year}</span></>
                            : <span style={{ color: "var(--text-3)" }}>—</span>}
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
