"use client";

// Vue dédiée au suivi des engagements de dette : pour chaque prêt, ce qui a été engagé,
// décaissé, remboursé et ce qui reste dû — plus l'historique des encaissements.
// Répond au retour de test : « dans quel onglet puis-je voir les paiements de chaque prêt ? »
// L'échéancier détaillé (saisie ligne à ligne) reste dans l'onglet Investissement.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtM } from "@/lib/format";
import { INSTRUMENT_TYPES } from "@/lib/ui-constants";
import type { Instrument } from "@/lib/data/instruments";
import { computeSchedule, paymentBehaviour, type PaymentBehaviour } from "@/lib/finance/amortization";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDay(d: string | null) { if (!d) return "—"; return `${d.slice(8, 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`; }
const typeLabel = (t: string) => INSTRUMENT_TYPES.find((x) => x.key === t)?.label ?? t;
const kindOf = (t: string) => INSTRUMENT_TYPES.find((x) => x.key === t)?.kind ?? "debt";
const TYPE_BADGE: Record<string, string> = { "quasi-equity": "badge-amber", "pret-campagne": "badge-neutral" };

type LoanSummary = {
  instrument: Instrument;
  committed: number;
  disbursed: number;
  totalDue: number;        // total à rembourser (capital + intérêts) selon l'échéancier
  collected: number;       // encaissements réels saisis
  invoiced: number;        // facturations réelles saisies
  principalRepaid: number; // capital amorti par les encaissements réels
  interestPaid: number;    // part intérêts couverte par les encaissements réels
  outstanding: number;     // capital restant dû
  arrears: number;         // échéances passées non soldées
  nextDate: string | null;
  nextAmount: number;
  settled: boolean;
  hasSchedule: boolean;
  behaviour: PaymentBehaviour;
};

function summarize(i: Instrument, today: string): LoanSummary {
  const sched = computeSchedule(i, today);
  const committed = i.amountCommitted ?? 0;
  const disbursed = i.amountDisbursed ?? 0;
  const principal = disbursed || committed;
  const collected = i.payments.reduce((a, p) => a + (p.paid ?? 0), 0);
  const invoiced = i.payments.reduce((a, p) => a + (p.invoiced ?? 0), 0);

  if (!sched) {
    return { instrument: i, committed, disbursed, totalDue: 0, collected, invoiced, principalRepaid: 0,
      interestPaid: 0, outstanding: principal - collected, arrears: 0, nextDate: null, nextAmount: 0,
      settled: false, hasSchedule: false, behaviour: paymentBehaviour([]) };
  }

  let principalRepaid = 0;
  let interestPaid = 0;
  let outstanding = principal;
  let nextDate: string | null = null;
  let nextAmount = 0;

  for (const row of sched.rows) {
    if (row.settled) continue;
    if (row.actual) {
      principalRepaid += row.principal;
      interestPaid += Math.min(row.paid, row.interest);
      outstanding = row.balance;
    }
    if (row.date && row.date > today && !nextDate && row.expected - row.paid > 0.5) {
      nextDate = row.date;
      nextAmount = row.expected - row.paid;
    }
  }
  const behaviour = paymentBehaviour(sched.rows);
  const settled = outstanding <= 0.5 && principalRepaid > 0;

  return { instrument: i, committed, disbursed, totalDue: sched.totalPaid, collected, invoiced,
    principalRepaid, interestPaid, outstanding: Math.max(0, outstanding), arrears: behaviour.arrears,
    nextDate, nextAmount, settled, hasSchedule: true, behaviour };
}

/** Comportement de paiement : ce que l'historique dit de la discipline de l'entrepreneur. */
function BehaviourBlock({ b }: { b: PaymentBehaviour }) {
  if (b.tracked === 0 && b.unrecorded === 0) return null;
  const items: [string, string, string | null][] = [
    ["Honorées", String(b.onTime), null],
    ["Réglées en retard", String(b.late), b.avgDaysLate != null ? `${b.avgDaysLate} j en moyenne` : null],
    ["Partielles", String(b.partial), null],
    ["Manquées", String(b.missed), null],
    ["Non saisies", String(b.unrecorded), "à renseigner"],
  ];
  const rate = b.reliability;
  const rateColor = rate == null ? "var(--text-3)" : rate >= 0.9 ? "var(--green-fg)" : rate >= 0.7 ? "var(--amber-fg)" : "var(--red-fg)";
  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "baseline" }}>
      <span style={{ fontSize: 11, color: "var(--text-2)" }}>
        Ponctualité{" "}
        <b className="tnum" style={{ color: rateColor, fontSize: 13 }}>
          {rate == null ? "—" : `${Math.round(rate * 100)} %`}
        </b>
        {b.tracked > 0 && <span style={{ color: "var(--text-3)" }}> sur {b.tracked} échéance{b.tracked > 1 ? "s" : ""} suivie{b.tracked > 1 ? "s" : ""}</span>}
      </span>
      {items.filter(([, v]) => v !== "0").map(([k, v, sub]) => (
        <span key={k} style={{ fontSize: 11, color: "var(--text-2)" }}>
          {k} <b className="tnum" style={{ color: "var(--ink)" }}>{v}</b>
          {sub && <span style={{ color: "var(--text-3)" }}> ({sub})</span>}
        </span>
      ))}
    </div>
  );
}

function mergeBehaviour(list: PaymentBehaviour[]): PaymentBehaviour {
  const m: PaymentBehaviour = { tracked: 0, onTime: 0, late: 0, partial: 0, missed: 0, unrecorded: 0,
    arrears: 0, avgDaysLate: null, reliability: null };
  let lateDays = 0;
  for (const b of list) {
    m.tracked += b.tracked; m.onTime += b.onTime; m.late += b.late; m.partial += b.partial;
    m.missed += b.missed; m.unrecorded += b.unrecorded; m.arrears += b.arrears;
    if (b.avgDaysLate != null) lateDays += b.avgDaysLate * b.late;
  }
  if (m.late > 0) m.avgDaysLate = Math.round(lateDays / m.late);
  if (m.tracked > 0) m.reliability = m.onTime / m.tracked;
  return m;
}

export default function RepaymentsTab({ instruments }: { instruments: Instrument[] }) {
  const router = useRouter();
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const loans = instruments.filter((i) => kindOf(i.type) === "debt");
  if (loans.length === 0) {
    return (
      <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>
        Aucun financement de dette. Ajoutez un quasi-equity ou un prêt de campagne dans l&apos;onglet Investissement.
      </div>
    );
  }

  const s = loans.map((i) => summarize(i, today));
  const sum = (f: (x: LoanSummary) => number) => s.reduce((a, x) => a + f(x), 0);
  const facts: [string, string, string][] = [
    ["Engagé", fmtM(sum((x) => x.committed)), `${loans.length} prêt${loans.length > 1 ? "s" : ""}`],
    ["Décaissé", fmtM(sum((x) => x.disbursed)), ""],
    ["Total à rembourser", fmtM(sum((x) => x.totalDue)), "capital + intérêts"],
    ["Encaissé", fmtM(sum((x) => x.collected)), ""],
    ["Capital restant dû", fmtM(sum((x) => x.outstanding)), ""],
    ["Arriérés", fmtM(sum((x) => x.arrears)), "échéances passées"],
  ];
  const totalArrears = sum((x) => x.arrears);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
        {facts.map(([k, v, sub]) => {
          const alert = k === "Arriérés" && totalArrears > 0.5;
          return (
            <div key={k} style={{ background: "var(--surface)", border: `1px solid ${alert ? "var(--red-fg)" : "var(--border)"}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--text-2)" }}>{k}</div>
              <div className="serif tnum" style={{ fontSize: 16, fontWeight: 600, color: alert ? "var(--red-fg)" : "var(--ink)", marginTop: 4 }}>{v}</div>
              {sub && <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2 }}>{sub}</div>}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: "12px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
          Comportement de paiement <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— tous prêts confondus, à verser au dossier pour les décisions futures</span>
        </div>
        <BehaviourBlock b={mergeBehaviour(s.map((x) => x.behaviour))} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>
        Engagements par prêt <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— avancement du remboursement et historique des paiements</span>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {s.map((x) => {
          const i = x.instrument;
          const progress = x.totalDue > 0 ? Math.min(1, x.collected / x.totalDue) : 0;
          const history = i.payments
            // Un encaissement saisi à 0 est un IMPAYÉ CONSTATÉ : il fait partie de
            // l'historique au même titre qu'un versement. Seul le champ vide est ignoré.
            .filter((p) => p.paid != null)
            .sort((a, b) => (b.paidDate ?? b.dueDate ?? "").localeCompare(a.paidDate ?? a.dueDate ?? ""));
          const open = openHistory === i.id;
          return (
            <div key={i.id} className="card" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 10 }}>
                <span className={`badge ${TYPE_BADGE[i.type] ?? "badge-neutral"}`}>{typeLabel(i.type)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{i.label ?? typeLabel(i.type)}</span>
                {x.settled && <span className="badge badge-green">Soldé</span>}
                {x.arrears > 0.5 && <span className="badge badge-red">Arriérés {fmtM(x.arrears)}</span>}
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-2)" }}>
                  {x.nextDate ? <>Prochaine échéance <b style={{ color: "var(--ink)" }}>{frDay(x.nextDate)}</b> · <b className="serif tnum" style={{ color: "var(--ink)" }}>{fmtM(x.nextAmount)}</b></> : x.settled ? "Prêt soldé" : "—"}
                </span>
              </div>

              {x.hasSchedule ? (
                <>
                  <div style={{ height: 7, borderRadius: 999, background: "var(--surface-cream)", overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ width: `${progress * 100}%`, height: "100%", background: x.arrears > 0.5 ? "var(--red-fg)" : "var(--green-fg)" }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-3)", marginBottom: 10 }}>
                    {fmtM(x.collected)} encaissés sur {fmtM(x.totalDue)} — {Math.round(progress * 100)} %
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>
                  Échéancier non calculable : renseignez montant, durée, périodicité et 1ʳᵉ échéance sur l&apos;instrument.
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, fontSize: 12 }}>
                {([
                  ["Engagé", fmtM(x.committed)],
                  ["Décaissé", fmtM(x.disbursed)],
                  ["Capital remboursé", fmtM(x.principalRepaid)],
                  ["Intérêts payés", fmtM(x.interestPaid)],
                  ["Capital restant dû", fmtM(x.outstanding)],
                  ["Facturé", fmtM(x.invoiced)],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{k}</div>
                    <div className="serif tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--sep)" }}>
                <BehaviourBlock b={x.behaviour} />
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--sep)", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => setOpenHistory(open ? null : i.id)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "var(--camel)" }}>
                  {open ? "− Masquer l'historique" : `+ Historique des paiements (${history.length})`}
                </button>
                <button onClick={() => router.refresh()}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11, color: "var(--text-3)" }}>
                  Actualiser
                </button>
              </div>

              {open && (
                history.length === 0 ? (
                  <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 8 }}>
                    Aucun encaissement saisi. Les paiements se saisissent dans l&apos;échéancier de l&apos;onglet Investissement.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", marginTop: 8 }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 460 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {["N°", "Échéance", "Date de paiement", "Facturé", "Encaissé"].map((h, k) => (
                            <th key={h} style={{ textAlign: k < 3 ? "left" : "right", padding: "5px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((p) => (
                          <tr key={p.id} style={{ borderBottom: "1px solid var(--sep)" }}>
                            <td style={{ padding: "5px 8px", fontSize: 11.5, color: "var(--text-3)" }}>{p.periodNo}</td>
                            <td style={{ padding: "5px 8px", fontSize: 11.5, color: "var(--ink)" }}>{frDay(p.dueDate)}</td>
                            <td style={{ padding: "5px 8px", fontSize: 11.5, color: "var(--ink)" }}>{frDay(p.paidDate)}</td>
                            <td className="tnum" style={{ padding: "5px 8px", fontSize: 11.5, textAlign: "right", color: "var(--text-2)" }}>{p.invoiced != null ? fmtM(p.invoiced) : "—"}</td>
                            <td className="tnum" style={{ padding: "5px 8px", fontSize: 11.5, textAlign: "right", fontWeight: 600, color: (p.paid ?? 0) > 0 ? "var(--green-fg)" : "var(--red-fg)" }}>
                              {(p.paid ?? 0) > 0 ? fmtM(p.paid ?? 0) : "impayé"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 12 }}>
        Cette vue agrège l&apos;échéancier calculé et les encaissements réels. La saisie ligne à ligne (facturé / encaissé) se fait dans l&apos;échéancier de l&apos;onglet <b>Investissement</b>.
      </div>
    </div>
  );
}
