"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtM } from "@/lib/format";
import { INSTRUMENT_TYPES } from "@/lib/ui-constants";
import type { Instrument } from "@/lib/data/instruments";
import InstrumentFormModal from "./InstrumentFormModal";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDate(d: string | null) { if (!d) return "—"; return `${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`; }
const typeLabel = (t: string) => INSTRUMENT_TYPES.find((x) => x.key === t)?.label ?? t;
const kindOf = (t: string) => INSTRUMENT_TYPES.find((x) => x.key === t)?.kind ?? "debt";
const TYPE_BADGE: Record<string, string> = { equity: "badge-green", "quasi-equity": "badge-amber", "pret-campagne": "badge-neutral" };

export default function InstrumentsTab({ companyId, instruments }: { companyId: string; instruments: Instrument[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; instrument: Instrument | null }>({ open: false, instrument: null });

  const committed = instruments.reduce((a, i) => a + (i.amountCommitted ?? 0), 0);
  const disbursed = instruments.reduce((a, i) => a + (i.amountDisbursed ?? 0), 0);
  const equityCommitted = instruments.filter((i) => kindOf(i.type) === "equity").reduce((a, i) => a + (i.amountCommitted ?? 0), 0);
  const debtCommitted = committed - equityCommitted;

  async function remove(i: Instrument) {
    if (!confirm(`Supprimer l'instrument « ${i.label ?? typeLabel(i.type)} » ?`)) return;
    await createClient().from("financing_instruments").delete().eq("id", i.id);
    router.refresh();
  }

  const facts: [string, string][] = [
    ["Total engagé", fmtM(committed)],
    ["Total décaissé", fmtM(disbursed)],
    ["Dont capital", fmtM(equityCommitted)],
    ["Dont dette", fmtM(debtCommitted)],
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        {facts.map(([k, v]) => (
          <div key={k} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-2)" }}>{k}</div>
            <div className="serif tnum" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Instruments de financement <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— capital, quasi-equity, prêt de campagne</span></div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, instrument: null })}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Ajouter un instrument
        </button>
      </div>

      {instruments.length === 0 ? (
        <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun instrument. Ajoutez le capital, le quasi-equity ou un prêt de campagne.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {instruments.map((i) => {
            const equity = kindOf(i.type) === "equity";
            return (
              <div key={i.id} className="card" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 8 }}>
                  <span className={`badge ${TYPE_BADGE[i.type] ?? "badge-neutral"}`}>{typeLabel(i.type)}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{i.label ?? "—"}</span>
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>octroi {frDate(i.grantDate)}</span>
                  <span className="row-actions" style={{ marginLeft: "auto" }}>
                    <button onClick={() => setModal({ open: true, instrument: i })} aria-label="Modifier"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
                    <button onClick={() => remove(i)} aria-label="Supprimer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
                  </span>
                </div>
                <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 12 }}>
                  <span style={{ color: "var(--text-2)" }}>Engagé <b className="serif tnum" style={{ color: "var(--ink)" }}>{fmtM(i.amountCommitted ?? 0)}</b></span>
                  <span style={{ color: "var(--text-2)" }}>Décaissé <b className="serif tnum" style={{ color: "var(--ink)" }}>{fmtM(i.amountDisbursed ?? 0)}</b></span>
                  {equity ? (
                    <>
                      <span style={{ color: "var(--text-2)" }}>Participation <b className="tnum" style={{ color: "var(--ink)" }}>{i.ownershipPct != null ? `${i.ownershipPct} %` : "—"}</b></span>
                      <span style={{ color: "var(--text-2)" }}>Valorisation <b className="serif tnum" style={{ color: "var(--ink)" }}>{i.valuation != null ? fmtM(i.valuation) : "—"}</b></span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: "var(--text-2)" }}>Taux <b className="tnum" style={{ color: "var(--ink)" }}>{i.interestRate != null ? `${i.interestRate} %` : "—"}{i.rateCap != null ? ` (plaf. ${i.rateCap} %)` : ""}</b></span>
                      <span style={{ color: "var(--text-2)" }}>Différé/Durée <b className="tnum" style={{ color: "var(--ink)" }}>{i.graceMonths ?? "—"} / {i.durationMonths ?? "—"} mois</b></span>
                      <span style={{ color: "var(--text-2)" }}>Périodicité <b style={{ color: "var(--ink)" }}>{i.periodicity ?? "—"}</b></span>
                    </>
                  )}
                </div>
                {i.notes && <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 8, lineHeight: 1.5 }}>{i.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 12 }}>
        Les échéanciers d'amortissement et le suivi des créances (facturation, encaissements, arriérés) arrivent à l'étape suivante.
      </div>

      {modal.open && <InstrumentFormModal companyId={companyId} instrument={modal.instrument} onClose={() => setModal({ open: false, instrument: null })} />}
    </div>
  );
}
