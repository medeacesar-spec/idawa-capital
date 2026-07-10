"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { REPORTING_STATUS } from "@/lib/ui-constants";
import type { ReportingData } from "@/lib/data/reporting";

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

export default function ReportingClient({ data }: { data: ReportingData }) {
  const router = useRouter();
  const [tab, setTab] = useState<"collecte" | "extraction">("collecte");
  const [period, setPeriod] = useState(data.periods[0] ?? "2026-T2");

  const statusFor = (companyId: string) => data.statuses.find((s) => s.companyId === companyId && s.period === period)?.status ?? "À faire";
  const done = data.companies.filter((c) => statusFor(c.id) === "Validé").length;

  async function cycle(companyId: string) {
    const cur = statusFor(companyId);
    const next = REPORTING_STATUS[(REPORTING_STATUS.indexOf(cur) + 1) % REPORTING_STATUS.length];
    await createClient().from("company_reporting").upsert({ company_id: companyId, period, status: next }, { onConflict: "company_id,period" });
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {([["collecte", "Collecte"], ["extraction", "Extraction"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "9px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === k ? 600 : 500, color: tab === k ? "var(--espresso)" : "var(--text-2)", borderBottom: `2px solid ${tab === k ? "var(--espresso)" : "transparent"}`, marginBottom: -1 }}>{label}</button>
        ))}
      </div>

      {tab === "collecte" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "var(--text-2)" }}>Période</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: "7px 11px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", fontFamily: "inherit", fontSize: 12.5, color: "var(--ink)" }}>
              {data.periods.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <span className="badge badge-green" style={{ marginLeft: "auto" }}>{done} / {data.companies.length} validés</span>
          </div>
          {data.companies.length === 0 ? (
            <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucune participation à collecter.</div>
          ) : (
            <div className="card" style={{ padding: "4px 18px" }}>
              {data.companies.map((c, i) => {
                const st = statusFor(c.id);
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
                    <button onClick={() => cycle(c.id)} title="Changer le statut" style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
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

      {tab === "extraction" && <Extraction data={data} />}
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
                {data.periods.map((p) => <option key={p} value={p}>{p}</option>)}
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
