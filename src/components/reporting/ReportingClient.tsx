"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { REPORTING_STATUS } from "@/lib/ui-constants";
import { currentPeriod, rollingPeriods, formatPeriod } from "@/lib/periods";
import { resolveCadence, type CadenceSettings } from "@/lib/cadence";
import type { ReportingData } from "@/lib/data/reporting";
import ExtractionPicker, { type ExtractionSet } from "./ExtractionPicker";
import ExcelBridgeClient from "./ExcelBridgeClient";

type Company = { id: string; name: string; tracking: string; programId: string | null };
type Dataset = { key: string; label: string; hint: string; editable: string[] };

const STATUS_BADGE: Record<string, string> = { "À faire": "badge-neutral", "En cours": "badge-amber", "Validé": "badge-green" };
function nf(n: number) { return new Intl.NumberFormat("fr-FR").format(Math.round(n)); }

function toCSV(headers: string[], rows: (string | number | null)[][]): string {
  const esc = (v: string | number | null) => { const s = v == null ? "" : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\n");
}
function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportingClient({ data, cadenceSettings, canEdit = true, extractionSets, programs, companies, datasets, excelCanEdit }: {
  data: ReportingData; cadenceSettings?: CadenceSettings; canEdit?: boolean; extractionSets: ExtractionSet[];
  programs: { id: string; name: string }[]; companies: Company[]; datasets: Dataset[]; excelCanEdit: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"collecte" | "extraction" | "fiches">("collecte");
  // La cadence peut différer par programme : on la résout selon le programme filtré.
  const [progFilter, setProgFilter] = useState<string>("all");
  const cadence = resolveCadence(cadenceSettings, "reporting", progFilter === "all" ? null : progFilter);
  // Périodes proposées : une fenêtre glissante dans la cadence, + celles déjà renseignées.
  const periodOptions = useMemo(() => {
    const gen = rollingPeriods(currentPeriod(cadence), cadence === "mensuelle" ? 18 : 8);
    return Array.from(new Set([...gen, ...data.periods])).sort().reverse();
  }, [cadence, data.periods]);
  const [period, setPeriod] = useState(() => currentPeriod(resolveCadence(cadenceSettings, "reporting")));
  function changeProg(pid: string) {
    setProgFilter(pid);
    setPeriod(currentPeriod(resolveCadence(cadenceSettings, "reporting", pid === "all" ? null : pid)));
  }
  const shownCompanies = progFilter === "all" ? data.companies : data.companies.filter((c) => c.programId === progFilter);

  const statusFor = (companyId: string) => data.statuses.find((s) => s.companyId === companyId && s.period === period)?.status ?? "À faire";
  const done = shownCompanies.filter((c) => statusFor(c.id) === "Validé").length;

  async function cycle(companyId: string) {
    const cur = statusFor(companyId);
    const next = REPORTING_STATUS[(REPORTING_STATUS.indexOf(cur) + 1) % REPORTING_STATUS.length];
    await createClient().from("company_reporting").upsert({ company_id: companyId, period, status: next }, { onConflict: "company_id,period" });
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {([
          ["collecte", cadence === "mensuelle" ? "Collecte mensuelle" : "Collecte trimestrielle"],
          ["extraction", "Extraire des données"],
          ["fiches", "Rapports & fiches I&P"],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "9px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === k ? 600 : 500, color: tab === k ? "var(--espresso)" : "var(--text-2)", borderBottom: `2px solid ${tab === k ? "var(--espresso)" : "transparent"}`, marginBottom: -1 }}>{label}</button>
        ))}
      </div>

      {tab === "collecte" && (
        <div>
          <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 14px" }}>Où en est la remontée des chiffres, société par société, pour {cadence === "mensuelle" ? "un mois" : "un trimestre"}.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            {programs.length > 0 && (
              <>
                <label style={{ fontSize: 12, color: "var(--text-2)" }}>Programme</label>
                <select value={progFilter} onChange={(e) => changeProg(e.target.value)} style={{ padding: "7px 11px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", fontFamily: "inherit", fontSize: 12.5, color: "var(--ink)" }}>
                  <option value="all">Tous les programmes</option>
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </>
            )}
            <label style={{ fontSize: 12, color: "var(--text-2)" }}>Période</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: "7px 11px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", fontFamily: "inherit", fontSize: 12.5, color: "var(--ink)" }}>
              {periodOptions.map((p) => <option key={p} value={p}>{formatPeriod(p)}</option>)}
            </select>
            <span className="badge badge-green" style={{ marginLeft: "auto" }}>{done} / {shownCompanies.length} validés</span>
          </div>
          {shownCompanies.length === 0 ? (
            <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucune participation à collecter{progFilter !== "all" ? " pour ce programme" : ""}.</div>
          ) : (
            <div className="card" style={{ padding: "4px 18px" }}>
              {shownCompanies.map((c, i) => {
                const st = statusFor(c.id);
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
                    <button onClick={() => canEdit && cycle(c.id)} disabled={!canEdit} title={canEdit ? "Changer le statut" : "Lecture seule"} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
                      <span className={`badge ${STATUS_BADGE[st]}`} style={{ cursor: "pointer", minWidth: 66, textAlign: "center" }}>{st}</span>
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
                      {c.programName && <div style={{ fontSize: 11, color: "var(--text-3)" }}>{c.programName}</div>}
                    </div>
                    <Link href={`/saisie?company=${c.id}`} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>Saisir</Link>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10 }}>Cliquez le statut pour le faire évoluer (À faire → En cours → Validé). « Saisir » ouvre la saisie de reporting de la société.</div>
        </div>
      )}

      {tab === "extraction" && (
        <>
          <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 14px" }}>Sortir les données de l&apos;outil vers un tableur — brut, à la carte.</p>
          <ExtractionPicker extractionSets={extractionSets} programs={programs} />
          <details style={{ marginTop: 4 }}>
            <summary style={{ fontSize: 12.5, color: "var(--text-2)", cursor: "pointer", padding: "6px 0" }}>
              Export CSV rapide — synthèse, données financières ou KPIs d&apos;une seule période
            </summary>
            <div style={{ marginTop: 10 }}><Extraction data={data} /></div>
          </details>
        </>
      )}

      {tab === "fiches" && (
        <>
          <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 14px" }}>
            Produire les rapports au format des modèles I&amp;P, et réinjecter un fichier retravaillé sous Excel.
          </p>
          <ExcelBridgeClient datasets={datasets} canEdit={excelCanEdit} companies={companies} programs={programs} />
        </>
      )}
    </div>
  );
}

function Extraction({ data }: { data: ReportingData }) {
  const [dataset, setDataset] = useState<"summary" | "financials" | "kpis">("summary");
  const [period, setPeriod] = useState(data.periods[0] ?? "2026-T2");

  const preview = useMemo(() => {
    if (dataset === "summary") {
      const headers = ["Société", "Secteur", "Programme", "Investi (FCFA)", "Valorisation (FCFA)", "TVPI", "TRI (%)", "Participation (%)", "Statut"];
      const rows = data.summary.map((s) => [s.name, s.sector, s.program, s.invested, s.valuation, s.tvpi, s.tri, s.ownership, s.status]);
      return { headers, rows, file: "synthese-portefeuille.csv" };
    }
    if (dataset === "financials") {
      const headers = ["Société", "Période", "Poste", "Budget", "Réalisé", "Écart"];
      const rows = data.financials.filter((f) => f.period === period).map((f) => [f.company, f.period, f.label, f.budget, f.actual, f.budget != null && f.actual != null ? f.actual - f.budget : null]);
      return { headers, rows, file: `donnees-financieres-${period}.csv` };
    }
    const headers = ["Société", "Catégorie", "Indicateur", "Unité", "Période", "Valeur"];
    const rows = data.kpis.filter((k) => k.period === period).map((k) => [k.company, k.category, k.name, k.unit, k.period, k.value]);
    return { headers, rows, file: `kpis-${period}.csv` };
  }, [dataset, period, data]);

  const needsPeriod = dataset !== "summary";

  return (
    <div>
      <div className="card" style={{ padding: "18px 20px", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>Construire un export</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 4 }}>Jeu de données</div>
            <select value={dataset} onChange={(e) => setDataset(e.target.value as "summary" | "financials" | "kpis")} style={{ padding: "8px 11px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", fontFamily: "inherit", fontSize: 12.5, color: "var(--ink)" }}>
              <option value="summary">Synthèse du portefeuille</option>
              <option value="financials">Données financières (par période)</option>
              <option value="kpis">KPIs suivis (par période)</option>
            </select>
          </div>
          {needsPeriod && (
            <div>
              <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 4 }}>Période</div>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: "8px 11px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", fontFamily: "inherit", fontSize: 12.5, color: "var(--ink)" }}>
                {data.periods.map((p) => <option key={p} value={p}>{formatPeriod(p)}</option>)}
              </select>
            </div>
          )}
          <button className="btn btn-primary" disabled={preview.rows.length === 0} onClick={() => download(preview.file, toCSV(preview.headers, preview.rows))} style={{ marginLeft: "auto" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 4 5-4" /><path d="M5 21h14" /></svg>
            Télécharger le CSV ({preview.rows.length})
          </button>
        </div>
      </div>

      {/* Aperçu */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>{preview.headers.map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 14px", background: "var(--surface-2)", color: "var(--text-2)", fontWeight: 600, whiteSpace: "nowrap", borderBottom: "1px solid var(--border)" }}>{h}</th>)}</tr></thead>
            <tbody>
              {preview.rows.length === 0 ? (
                <tr><td colSpan={preview.headers.length} style={{ padding: "24px", textAlign: "center", color: "var(--text-3)" }}>Aucune donnée pour cette sélection.</td></tr>
              ) : preview.rows.slice(0, 30).map((r, i) => (
                <tr key={i}>{r.map((v, j) => <td key={j} className={typeof v === "number" ? "tnum" : ""} style={{ padding: "9px 14px", borderTop: "1px solid var(--sep)", color: "var(--ink)", whiteSpace: "nowrap" }}>{typeof v === "number" ? nf(v) : (v ?? "—")}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        {preview.rows.length > 30 && <div style={{ fontSize: 11, color: "var(--text-3)", padding: "8px 14px" }}>Aperçu des 30 premières lignes — l'export contient les {preview.rows.length} lignes.</div>}
      </div>
    </div>
  );
}
