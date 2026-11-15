"use client";

// Onglet « Reporting entreprise » : qui dépose, quand, qui suit chez Idawa, et le calendrier
// des périodes qui en découle (feuille de route, phase 2). La page de dépôt (phase 4) s'appuiera
// sur ce paramétrage.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select } from "@/components/ui/form";
import type { FundUser } from "@/lib/data/users";
import { DEFAULT_SETUP, calendarFor, formatDay, type ReportingSetup, type SeasonalShift } from "@/lib/reporting/calendar";
import { saveReportingSetup } from "@/app/(app)/portefeuille/actions";

const MONTHS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
const STATE_STYLE: Record<string, { bg: string; fg: string }> = {
  "à venir": { bg: "var(--surface-cream)", fg: "var(--text-2)" },
  "ouverte": { bg: "#F7ECD6", fg: "#8A5A12" },
  "en retard": { bg: "#F6E1DC", fg: "#A6412E" },
};
const card: React.CSSProperties = { padding: "16px 18px", marginBottom: 14 };
const h3: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: "0 0 4px" };
const sub: React.CSSProperties = { fontSize: 12, color: "var(--text-3)", margin: "0 0 12px", lineHeight: 1.5 };

export default function ReportingSetupTab({ companyId, setup, users, canEdit }: {
  companyId: string; setup: ReportingSetup | null; users: FundUser[]; canEdit: boolean;
}) {
  const router = useRouter();
  const init = setup ?? { companyId, ...DEFAULT_SETUP };
  const [f, setF] = useState({
    referentName: init.referentName ?? "", referentEmail: init.referentEmail ?? "", referentPhone: init.referentPhone ?? "",
    chargeId: init.chargeId ?? "", suppleantId: init.suppleantId ?? "",
    expectsMonthly: init.expectsMonthly, expectsAnnual: init.expectsAnnual,
    openDay: init.openDay, dueDay: init.dueDay, annualDueMonth: init.annualDueMonth, annualDueDay: init.annualDueDay,
    startsOn: init.startsOn.slice(0, 7),
  });
  const [shifts, setShifts] = useState<SeasonalShift[]>(init.seasonalShifts);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof f, v: string | number | boolean) => setF((p) => ({ ...p, [k]: v }));
  const year = new Date().getFullYear();

  const preview = useMemo(() => calendarFor({ ...init, ...f, startsOn: `${f.startsOn}-01`, chargeId: f.chargeId || null, suppleantId: f.suppleantId || null, seasonalShifts: shifts }, year),
    [f, shifts, year]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setBusy(true); setMsg(null);
    const r = await saveReportingSetup(companyId, { ...f, chargeId: f.chargeId || null, suppleantId: f.suppleantId || null, seasonalShifts: shifts });
    setBusy(false);
    if ("error" in r && r.error) setMsg({ ok: false, text: r.error });
    else { setMsg({ ok: true, text: "Paramétrage enregistré." }); router.refresh(); }
  }

  const toggleMonth = (i: number, m: number) => setShifts((s) => s.map((x, k) => k !== i ? x : { ...x, months: x.months.includes(m) ? x.months.filter((y) => y !== m) : [...x.months, m] }));
  const dis = !canEdit;

  return (
    <div>
      {!setup && (
        <div className="card" style={{ ...card, background: "#F7ECD6", color: "#8A5A12", fontSize: 12.5 }}>
          Le suivi des dépôts n&apos;est pas encore paramétré pour cette entreprise. Les valeurs ci-dessous sont celles par défaut : renseignez le référent et le chargé de suivi, puis enregistrez.
        </div>
      )}

      <div className="card" style={card}>
        <h3 style={h3}>Qui dépose, et qui suit</h3>
        <p style={sub}>Le référent reçoit le lien personnel de dépôt et les rappels. Le chargé de suivi est prévenu à chaque dépôt ; le suppléant prend le relais en son absence.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Field label="Référent dans l'entreprise"><Input disabled={dis} value={f.referentName} onChange={(e) => set("referentName", e.target.value)} placeholder="Nom et fonction" /></Field>
          <Field label="E-mail du référent"><Input disabled={dis} type="email" value={f.referentEmail} onChange={(e) => set("referentEmail", e.target.value)} placeholder="prenom.nom@entreprise.com" /></Field>
          <Field label="Téléphone (WhatsApp)"><Input disabled={dis} value={f.referentPhone} onChange={(e) => set("referentPhone", e.target.value)} placeholder="+229 01 …" /></Field>
          <Field label="Chargé de suivi (Idawa)">
            <Select disabled={dis} value={f.chargeId} onChange={(e) => set("chargeId", e.target.value)}>
              <option value="">— Choisir —</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
          <Field label="Suppléant (Idawa)">
            <Select disabled={dis} value={f.suppleantId} onChange={(e) => set("suppleantId", e.target.value)}>
              <option value="">— Choisir —</option>{users.filter((u) => u.id !== f.chargeId).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
        </div>
      </div>

      <div className="card" style={card}>
        <h3 style={h3}>Quand</h3>
        <p style={sub}>Mois M : la période s&apos;ouvre le jour choisi du mois M (rappel envoyé ce jour-là) et doit être déposée au plus tard le jour choisi du mois suivant.</p>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 12 }}>
          <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13 }}><input type="checkbox" disabled={dis} checked={f.expectsMonthly} onChange={(e) => set("expectsMonthly", e.target.checked)} /> Tableau de bord mensuel</label>
          <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13 }}><input type="checkbox" disabled={dis} checked={f.expectsAnnual} onChange={(e) => set("expectsAnnual", e.target.checked)} /> Classeur annuel (états financiers)</label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          <Field label="Suivi à partir de (mois)"><Input disabled={dis} type="month" value={f.startsOn} onChange={(e) => set("startsOn", e.target.value)} /></Field>
          <Field label="Ouverture : jour du mois M"><Input disabled={dis} type="number" min={1} max={28} value={f.openDay} onChange={(e) => set("openDay", Number(e.target.value))} /></Field>
          <Field label="Échéance : jour du mois M+1"><Input disabled={dis} type="number" min={1} max={28} value={f.dueDay} onChange={(e) => set("dueDay", Number(e.target.value))} /></Field>
          <Field label="Annuel : jour d'échéance"><Input disabled={dis} type="number" min={1} max={31} value={f.annualDueDay} onChange={(e) => set("annualDueDay", Number(e.target.value))} /></Field>
          <Field label="Annuel : mois d'échéance (N+1)">
            <Select disabled={dis} value={f.annualDueMonth} onChange={(e) => set("annualDueMonth", Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
          </Field>
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", margin: "16px 0 4px" }}>Haute saison : délais accordés à l&apos;avance</div>
        <p style={{ ...sub, marginBottom: 8 }}>Pour les mois cochés, l&apos;échéance est repoussée du nombre de jours indiqué (ex. campagne de mangue).</p>
        {shifts.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--sep)" }}>
            {MONTHS.map((m, k) => {
              const on = s.months.includes(k + 1);
              return <button key={m} disabled={dis} onClick={() => toggleMonth(i, k + 1)} style={{ padding: "4px 9px", borderRadius: 999, fontSize: 11.5, cursor: dis ? "default" : "pointer", fontFamily: "inherit",
                background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)", border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}` }}>{m}</button>;
            })}
            <span style={{ fontSize: 12.5 }}>+</span>
            <Input disabled={dis} type="number" min={1} max={20} value={s.extra_days} style={{ width: 70 }} onChange={(e) => setShifts((x) => x.map((y, k) => k === i ? { ...y, extra_days: Number(e.target.value) } : y))} />
            <span style={{ fontSize: 12.5 }}>jours</span>
            {canEdit && <button className="btn btn-ghost" style={{ padding: "3px 9px", fontSize: 11 }} onClick={() => setShifts((x) => x.filter((_, k) => k !== i))}>Retirer</button>}
          </div>
        ))}
        {canEdit && <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={() => setShifts((x) => [...x, { months: [], extra_days: 3 }])}>+ Ajouter une période de haute saison</button>}
      </div>

      {canEdit && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer le paramétrage"}</button>
          {msg && <span style={{ fontSize: 12.5, color: msg.ok ? "#3B6D11" : "var(--red-fg, #A6412E)" }}>{msg.text}</span>}
        </div>
      )}

      <div className="card" style={card}>
        <h3 style={h3}>Calendrier {year}</h3>
        <p style={sub}>Calculé à partir du paramétrage ci-dessus. Le statut « déposé » apparaîtra avec la page de dépôt.</p>
        {preview.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Aucun dépôt attendu.</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr style={{ textAlign: "left", color: "var(--text-2)" }}>
              <th style={{ padding: "6px 4px" }}>Période</th><th>Ouverture</th><th>Échéance</th><th>Statut</th>
            </tr></thead>
            <tbody>{preview.map((p) => (
              <tr key={p.kind + p.period} style={{ borderTop: "1px solid var(--sep)" }}>
                <td style={{ padding: "6px 4px", fontWeight: 600 }}>{p.label}</td>
                <td>{formatDay(p.opens)}</td>
                <td>{formatDay(p.due)}{p.extraDays ? <span style={{ color: "var(--text-3)" }}> (+{p.extraDays} j)</span> : null}</td>
                <td><span className="badge" style={{ background: STATE_STYLE[p.state].bg, color: STATE_STYLE[p.state].fg }}>{p.state}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
