"use client";

// Consolidation de l'accélération : ce que les programmes d'accompagnement ont produit.
//
// Les indicateurs étant configurables programme par programme, aucune grille de colonnes
// fixes ne conviendrait : chaque programme affiche donc les siens, avec sa cible quand
// elle est fixée.

import { useRouter } from "next/navigation";
import { fmtM } from "@/lib/format";
import type { SupportOverview, SupportIndicatorTotal } from "@/lib/data/supportOverview";

const NATURE_LABEL: Record<string, string> = { accompagnement: "Accélération", mixte: "Mixte" };

function fmtValue(t: SupportIndicatorTotal) {
  if (t.unit === "FCFA") return fmtM(t.value);
  if (t.unit === "%") return `${t.value.toFixed(0)} %`;
  const n = new Intl.NumberFormat("fr-FR").format(Math.round(t.value * 10) / 10);
  return t.unit ? `${n} ${t.unit}` : n;
}

export default function SupportOverviewBlock({ data }: { data: SupportOverview }) {
  const router = useRouter();
  if (data.programs.length === 0) return null;

  const tiles: [string, string, string][] = [
    ["Entreprises suivies dans l'outil", String(data.totalCompanies), `${data.programs.length} programme${data.programs.length > 1 ? "s" : ""}`],
    ["Budget alloué", fmtM(data.budget), "tous programmes"],
    ["Décaissé", fmtM(data.disbursed), ""],
    ["Taux d'exécution", data.executionRate == null ? "—" : `${Math.round(data.executionRate * 100)} %`, "du budget alloué"],
  ];

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>
        Accélération <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— consolidation des programmes d&apos;accompagnement</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
        {tiles.map(([k, v, sub]) => (
          <div key={k} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-2)" }}>{k}</div>
            <div className="serif tnum" style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{v}</div>
            {sub && <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        {data.programs.map((p) => (
          <div key={p.id} className="card" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color ?? "var(--text-3)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
              <span className="badge badge-neutral">{NATURE_LABEL[p.nature] ?? p.nature}</span>
              <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-2)" }}>
<b className="tnum" style={{ color: "var(--ink)" }}>{p.companies}</b> fiche{p.companies > 1 ? "s" : ""}
              </span>
            </div>

            {p.indicators.length === 0 ? (
              <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                Aucun indicateur renseigné. Saisissez-les sur les fiches entreprise et dans les paramètres du programme.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 7 }}>
                {p.indicators.map((t) => {
                  const share = t.target && t.target > 0 ? Math.min(1, t.value / t.target) : null;
                  return (
                    <div key={t.name}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 11.5 }}>
                        <span style={{ color: "var(--text-2)", flex: 1, minWidth: 0 }}>
                          {t.name}
                          {t.scope === "entreprise" && <span style={{ color: "var(--text-3)", fontSize: 9.5, marginLeft: 5 }} title="Somme des saisies par entreprise">cumulé</span>}
                        </span>
                        <span className="tnum" style={{ fontWeight: 600, color: "var(--ink)" }}>{fmtValue(t)}</span>
                        {t.target != null && <span className="tnum" style={{ color: "var(--text-3)", fontSize: 10.5 }}>/ {fmtValue({ ...t, value: t.target })}</span>}
                      </div>
                      {share != null && (
                        <div style={{ height: 4, borderRadius: 999, background: "var(--surface-cream)", overflow: "hidden", marginTop: 3 }}>
                          <div style={{ width: `${share * 100}%`, height: "100%", background: share >= 0.9 ? "var(--green-fg)" : share >= 0.6 ? "var(--camel)" : "var(--amber-fg)" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={() => router.push(`/parametres/${p.id}`)}
              style={{ background: "none", border: "none", padding: 0, marginTop: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600, color: "var(--camel)" }}>
              Configurer et saisir →
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 8, lineHeight: 1.6 }}>
        Les indicateurs marqués <b>cumulé</b> sont la somme de ce qui a été saisi sur chaque fiche entreprise ; les autres se
        saisissent au niveau du programme. Chaque indicateur affiche sa <b>dernière période renseignée</b>, indépendamment des autres.
        Les entreprises sorties ou radiées et les programmes clos sont exclus.
        <br />
        Le nombre de <b>fiches</b> compte les entreprises réellement suivies dans l&apos;outil. S&apos;il diffère de l&apos;indicateur
        « PME accompagnées » déclaré pour le programme, c&apos;est que toutes les bénéficiaires n&apos;ont pas encore de fiche —
        l&apos;écart est un signal, pas une erreur de calcul.
      </div>
    </div>
  );
}
