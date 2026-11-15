"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CalendarPeriod } from "@/lib/reporting/calendar";

export type PortalPeriod = CalendarPeriod;
export type PortalDeposit = { id: string; kind: string; period: string; version: number; at: string; reason: string | null; changes: number; warnings: number };
type Change = { sheet: string; code: string; label: string | null; month: string; before: unknown; after: unknown };

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const day = (d: string) => `${parseInt(d.slice(8, 10), 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1]} ${d.slice(0, 4)}`;
const stamp = (d: string) => { const x = new Date(d); return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()} à ${String(x.getHours()).padStart(2, "0")}h${String(x.getMinutes()).padStart(2, "0")}`; };
const fmt = (v: unknown) => typeof v === "number" ? v.toLocaleString("fr-FR") : v == null || v === "" ? "vide" : String(v);
const box: React.CSSProperties = { padding: "18px 20px", marginBottom: 14 };

function quarters(): string[] {
  const now = new Date(); const out: string[] = [];
  let y = now.getFullYear(), q = Math.floor(now.getMonth() / 3);       // trimestre précédent d'abord
  for (let i = 0; i < 4; i++) { if (q === 0) { y--; q = 4; } out.push(`${y}-T${q}`); q--; }
  return out;
}

export default function DepositPortal({ token, companyName, referent, periods, deposits, hasModel = false }: {
  token: string; companyName: string; referent: string | null; periods: PortalPeriod[]; deposits: PortalDeposit[]; hasModel?: boolean;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<{ kind: string; period: string; label: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; warnings?: string[] } | null>(null);
  const [changes, setChanges] = useState<{ count: number; list: Change[] } | null>(null);
  const [quarter, setQuarter] = useState(quarters()[0]);

  const last = (kind: string, period: string) => deposits.find((d) => d.kind === kind && d.period === period);
  const lastFile = deposits.find((d) => d.kind === "mensuel") ?? null;
  const lastAnnual = deposits.find((d) => d.kind === "annuel") ?? null;

  function open(kind: string, period: string, label: string) {
    setTarget({ kind, period, label }); setFile(null); setReason(""); setMsg(null); setChanges(null);
  }

  async function send(over?: { kind: string; period: string }) {
    const t = over ?? target;
    if (!t || !file) return;
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.set("kind", t.kind); fd.set("period", t.period); fd.set("file", file); if (reason.trim()) fd.set("reason", reason.trim());
    const res = await fetch(`/api/d/${token}/depot`, { method: "POST", body: fd });
    const j = await res.json().catch(() => ({ ok: false, error: "Réponse illisible du serveur." }));
    setBusy(false);
    if (res.status === 409 && j.needsReason) { setChanges({ count: j.changesCount, list: j.changes }); setMsg({ ok: false, text: j.error }); return; }
    if (!j.ok) { setMsg({ ok: false, text: j.error ?? "Dépôt refusé." }); return; }
    setMsg({ ok: true, text: `Dépôt enregistré (version V${j.version}). Merci ! Idawa Capital en est informé.`, warnings: j.warnings });
    setChanges(null); setTarget(null); router.refresh();
  }

  const state = (p: PortalPeriod) => {
    const d = last(p.kind, p.period);
    if (d) return { text: `Déposé · V${d.version}`, bg: "#E6F0DA", fg: "#3B6D11" };
    return p.state === "en retard" ? { text: "En retard", bg: "#F6E1DC", fg: "#A6412E" } : { text: "À déposer", bg: "#F7ECD6", fg: "#8A5A12" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream, #FAF6F0)", padding: "24px 14px 60px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--espresso)", letterSpacing: ".5px", marginBottom: 14 }}>IDAWA CAPITAL</div>
        <div className="card" style={box}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--camel)", textTransform: "uppercase", letterSpacing: ".05em" }}>Espace de dépôt</div>
          <h1 className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)", margin: "4px 0 8px" }}>{companyName}</h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
            {referent ? <>Bonjour {referent}. </> : null}Déposez ici votre tableau de bord chaque mois, et votre classeur annuel après l&apos;arrêté des comptes.
            Chaque dépôt est conservé ; vous pouvez corriger à tout moment en déposant une nouvelle version.
          </p>
          {(lastFile || lastAnnual) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {lastFile && <a className="btn btn-ghost" href={`/api/d/${token}/fichier?id=${lastFile.id}`}>Télécharger mon dernier tableau de bord</a>}
              {!lastFile && hasModel && <a className="btn btn-ghost" href={`/api/d/${token}/fichier?modele=1`}>Télécharger mon tableau de bord (à remplir)</a>}
              {lastAnnual && <a className="btn btn-ghost" href={`/api/d/${token}/fichier?id=${lastAnnual.id}`}>Télécharger mon dernier classeur annuel</a>}
            </div>
          )}
        </div>

        {msg && !target && (
          <div className="card" style={{ ...box, background: msg.ok ? "#E6F0DA" : "#F6E1DC", color: msg.ok ? "#3B6D11" : "#A6412E", fontSize: 13 }}>
            {msg.text}
            {msg.warnings && msg.warnings.length > 0 && (
              <div style={{ marginTop: 8, color: "#8A5A12" }}>Points à vérifier dans votre fichier :<ul style={{ margin: "4px 0 0 18px" }}>{msg.warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>
            )}
          </div>
        )}

        <div className="card" style={{ ...box, padding: "6px 20px" }}>
          {periods.length === 0 && <div style={{ padding: 16, fontSize: 13, color: "var(--text-3)" }}>Aucune période ouverte pour le moment.</div>}
          {periods.map((p, i) => {
            const st = state(p); const isOpen = target && target.kind === p.kind && target.period === p.period;
            return (
              <div key={p.kind + p.period} style={{ borderTop: i ? "1px solid var(--sep)" : "none", padding: "12px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 200px" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{p.kind === "annuel" ? p.label : `Tableau de bord — ${p.label}`}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>À déposer avant le {day(p.due)}</div>
                  </div>
                  <span className="badge" style={{ background: st.bg, color: st.fg }}>{st.text}</span>
                  <button className="btn btn-primary" style={{ padding: "6px 14px" }} onClick={() => open(p.kind, p.period, p.label)}>{last(p.kind, p.period) ? "Corriger" : "Déposer"}</button>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 12, padding: 14, background: "var(--surface-cream)", borderRadius: 10 }}>
                    <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 8 }}>
                      {p.kind === "annuel" ? "Votre classeur annuel (.xlsx), avec les états financiers de l'exercice." : "Votre tableau de bord (.xlsx), avec le mois rempli."} 4 Mo maximum.
                    </div>
                    <input type="file" accept=".xlsx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setChanges(null); setMsg(null); }} />
                    {changes && (
                      <div style={{ marginTop: 12, fontSize: 12.5 }}>
                        <div style={{ color: "#A6412E", marginBottom: 6 }}>{changes.count} chiffre{changes.count > 1 ? "s" : ""} déjà déposé{changes.count > 1 ? "s" : ""} change{changes.count > 1 ? "nt" : ""} :</div>
                        <ul style={{ margin: "0 0 8px 18px", color: "var(--text-2)" }}>
                          {changes.list.map((c, k) => <li key={k}>{c.label ?? c.code} ({c.month}) : {fmt(c.before)} → {fmt(c.after)}</li>)}
                        </ul>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif de la correction (ex. facture d'octobre reçue en retard)"
                          style={{ width: "100%", minHeight: 50, padding: "8px 10px", border: "1px solid var(--border-strong)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }} />
                      </div>
                    )}
                    {msg && !msg.ok && <div style={{ marginTop: 8, fontSize: 12.5, color: "#A6412E" }}>{msg.text}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn btn-primary" disabled={busy || !file || (!!changes && !reason.trim())} onClick={() => send()}>{busy ? "Vérification et envoi…" : "Envoyer"}</button>
                      <button className="btn btn-ghost" onClick={() => setTarget(null)}>Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="card" style={box}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Relevés bancaires du trimestre</div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 10 }}>Un PDF par compte, à déposer après chaque trimestre.</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={quarter} onChange={(e) => setQuarter(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", fontFamily: "inherit" }}>
              {quarters().map((q) => <option key={q} value={q}>{q.replace("-T", " — T")}</option>)}
            </select>
            <input type="file" accept=".pdf" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setTarget({ kind: "releve", period: quarter, label: quarter }); setMsg(null); }} />
            <button className="btn btn-primary" disabled={busy || !file || target?.kind !== "releve"} onClick={() => send({ kind: "releve", period: quarter })}>Envoyer le relevé</button>
          </div>
          {msg && !msg.ok && target?.kind === "releve" && <div style={{ marginTop: 8, fontSize: 12.5, color: "#A6412E" }}>{msg.text}</div>}
        </div>

        {deposits.length > 0 && (
          <div className="card" style={box}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Mes dépôts</div>
            {deposits.slice(0, 30).map((d) => (
              <div key={d.id} style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "6px 0", borderTop: "1px solid var(--sep)", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, minWidth: 120 }}>{d.kind === "releve" ? `Relevé ${d.period}` : d.kind === "annuel" ? `Exercice ${d.period}` : d.period} · V{d.version}</span>
                <span style={{ color: "var(--text-3)" }}>{stamp(d.at)}</span>
                {d.reason && <span style={{ color: "var(--text-2)" }}>Motif : {d.reason}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
