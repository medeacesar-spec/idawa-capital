"use client";

import { useState } from "react";
import { exportAudit } from "@/app/(app)/journal/actions";
import type { AuditEntry } from "@/lib/data/audit";

const TABLE_LABEL: Record<string, string> = {
  deals: "Dossier", portfolio_companies: "Participation", committee_passages: "Comité", esg_actions: "Action E&S",
  esg_assessments: "Diagnostic ESG", company_flows: "Flux / valorisation", company_financials: "Budget", company_captable: "Cap table",
  contacts: "Contact", partners: "Partenaire", tracked_kpis: "KPI", dd_items: "Due diligence", value_creation: "Création de valeur",
  documents: "Document", company_reporting: "Reporting", programs: "Programme", roles: "Rôle", profiles: "Utilisateur",
};
const ACTION_LABEL: Record<string, string> = { INSERT: "Création", UPDATE: "Modification", DELETE: "Suppression" };

function fmtDateTime(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function csvCell(v: string | null) { const s = v == null ? "" : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

export default function AuditExportButton() {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await exportAudit();
    setBusy(false);
    if (res.error || !res.entries) { alert(res.error ?? "Échec de l'export."); return; }
    const headers = ["Date et heure", "Action", "Objet", "Élément", "Par"];
    const rows = (res.entries as AuditEntry[]).map((e) => [
      fmtDateTime(e.at), ACTION_LABEL[e.action] ?? e.action, TABLE_LABEL[e.table] ?? e.table, e.label ?? "", e.actor ?? "",
    ]);
    const csv = "﻿" + [headers, ...rows].map((r) => r.map(csvCell).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "journal-audit.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button className="btn btn-primary" onClick={run} disabled={busy}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 4 5-4" /><path d="M5 21h14" /></svg>
      {busy ? "Export…" : "Exporter en CSV"}
    </button>
  );
}
