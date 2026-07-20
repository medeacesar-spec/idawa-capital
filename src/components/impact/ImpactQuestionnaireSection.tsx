"use client";

// Gestion interne du questionnaire d'impact, dans l'onglet ESG. Idawa crée un exercice,
// envoie le lien à l'entrepreneur, puis relit / corrige / valide ce qui revient.

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCanEdit } from "@/components/shared/WriteAccess";
import Modal from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/form";
import QuestionnaireForm from "@/components/impact/QuestionnaireForm";
import { totalEmplois, impactCues, type QData } from "@/lib/impact/questionnaire";
import { createQuestionnaire, sendQuestionnaire, setQuestionnaireContact, saveQuestionnaireData, validateQuestionnaire } from "@/app/(app)/impact-actions";

type Row = { id: string; year: number; status: string; contact_name: string | null; contact_email: string | null; token: string; submitted_at: string | null; validated_at: string | null; data: QData };
const BADGE: Record<string, string> = { "Brouillon": "badge-neutral", "Envoyé": "badge-amber", "Reçu": "badge-green", "Validé": "badge-green" };

export default function ImpactQuestionnaireSection({ entityType, entityId }: { entityType: "deal" | "company"; entityId: string }) {
  const canEdit = useCanEdit();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<Row | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const { data } = await createClient()
      .from("impact_questionnaires")
      .select("id, year, status, contact_name, contact_email, token, submitted_at, validated_at, data")
      .eq("entity_type", entityType).eq("entity_id", entityId).order("year", { ascending: false });
    setRows((data as Row[]) ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, [entityType, entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  function copyLink(token: string) {
    const url = `${window.location.origin}/q/${token}`;
    navigator.clipboard?.writeText(url);
    setCopied(token); setTimeout(() => setCopied(null), 2000);
  }
  async function send(id: string) {
    setMsg(null);
    const res = await sendQuestionnaire(id);
    if (res.error) setMsg(res.error);
    else if (res.skipped) setMsg("Statut passé à « Envoyé ». Email non parti (clé Resend absente) — copiez le lien pour le transmettre.");
    else setMsg("Lien envoyé à l'entrepreneur par email.");
    load();
  }

  return (
    <div className="card" style={{ padding: "16px 18px", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Questionnaire d&apos;impact</div>
          <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 2 }}>Envoyé à l&apos;entrepreneur pour l&apos;exercice ; vous relisez et validez ce qui revient.</div>
        </div>
        {canEdit && <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setNewOpen(true)}>+ Nouvel exercice</button>}
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "var(--text-3)", padding: "10px 0" }}>Chargement…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--text-3)", padding: "12px 0" }}>Aucun exercice. Créez-en un pour envoyer le questionnaire à l&apos;entrepreneur.</div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)" }}>
              <span className="serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Exercice {r.year}</span>
              <span className={`badge ${BADGE[r.status] ?? "badge-neutral"}`}>{r.status}</span>
              {r.contact_email && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{r.contact_name ? `${r.contact_name} · ` : ""}{r.contact_email}</span>}
              {(r.status === "Reçu" || r.status === "Validé") && <span style={{ fontSize: 11, color: "var(--text-2)" }}>· {totalEmplois(r.data ?? {})} emplois déclarés</span>}
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className="btn btn-ghost" style={{ padding: "4px 9px", fontSize: 11 }} onClick={() => copyLink(r.token)}>{copied === r.token ? "Copié ✓" : "Copier le lien"}</button>
                {canEdit && r.status !== "Validé" && <button className="btn btn-ghost" style={{ padding: "4px 9px", fontSize: 11 }} onClick={() => send(r.id)}>Envoyer par email</button>}
                <button className="btn btn-ghost" style={{ padding: "4px 9px", fontSize: 11 }} onClick={() => setReview(r)}>{r.status === "Reçu" || r.status === "Validé" ? "Analyser" : "Voir"}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {msg && <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 8 }}>{msg}</div>}

      <TrendTable rows={rows} />

      {newOpen && <NewExerciseModal entityType={entityType} entityId={entityId} onClose={() => setNewOpen(false)} onCreated={() => { setNewOpen(false); load(); }} />}
      {review && <ReviewModal row={review} canEdit={canEdit} onClose={() => { setReview(null); load(); }} />}
    </div>
  );
}

// Suivi pluriannuel : les repères d'impact, exercice par exercice, dès qu'au moins deux
// questionnaires ont été renseignés.
function TrendTable({ rows }: { rows: Row[] }) {
  const withData = rows.filter((r) => r.status === "Reçu" || r.status === "Validé");
  if (withData.length < 2) return null;
  const byYear = withData.map((r) => ({ year: r.year, cues: impactCues(r.data ?? {}) })).sort((a, b) => a.year - b.year);
  const labels: string[] = [];
  byYear.forEach((y) => y.cues.forEach((c) => { if (!labels.includes(c.label)) labels.push(c.label); }));
  const val = (year: number, label: string) => byYear.find((y) => y.year === year)?.cues.find((c) => c.label === label)?.value ?? "—";
  const th: React.CSSProperties = { padding: "6px 10px", fontSize: 11, color: "var(--text-2)", textAlign: "right", borderBottom: "1px solid var(--border-strong)" };
  const td: React.CSSProperties = { padding: "5px 10px", fontSize: 12, textAlign: "right", borderBottom: "1px solid var(--sep)" };
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Suivi pluriannuel</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 360 }}>
          <thead><tr>
            <th style={{ ...th, textAlign: "left" }}>Indicateur</th>
            {byYear.map((y) => <th key={y.year} style={th}>{y.year}</th>)}
          </tr></thead>
          <tbody>
            {labels.map((lb) => (
              <tr key={lb}>
                <td style={{ ...td, textAlign: "left", color: "var(--text-2)" }}>{lb}</td>
                {byYear.map((y) => <td key={y.year} className="tnum" style={{ ...td, fontWeight: 600, color: "var(--ink)" }}>{val(y.year, lb)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewExerciseModal({ entityType, entityId, onClose, onCreated }: { entityType: "deal" | "company"; entityId: string; onClose: () => void; onCreated: () => void }) {
  const [year, setYear] = useState(String(new Date().getFullYear() - 1));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function create() {
    setBusy(true); setErr(null);
    const res = await createQuestionnaire({ entityType, entityId, year: Number(year), contactName: name, contactEmail: email });
    setBusy(false);
    if (res.error) setErr(res.error); else onCreated();
  }
  return (
    <Modal title="Nouvel exercice de questionnaire" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={busy || !year} onClick={create}>{busy ? "…" : "Créer"}</button></>}>
      <Field label="Exercice fiscal (année)"><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Ex : 2025" /></Field>
      <Field label="Nom du contact chez l'entrepreneur (optionnel)"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : dirigeant, responsable admin…" /></Field>
      <Field label="Email de l'entrepreneur (pour l'envoi)"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@entreprise.com" /></Field>
      {err && <div style={{ fontSize: 12, color: "var(--red-fg)", marginTop: 8 }}>{err}</div>}
      <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 8, lineHeight: 1.5 }}>Un lien unique est généré. Vous pourrez l&apos;envoyer par email ou le copier pour le transmettre.</div>
    </Modal>
  );
}

function ReviewModal({ row, canEdit, onClose }: { row: Row; canEdit: boolean; onClose: () => void }) {
  const [data, setData] = useState<QData>(row.data ?? {});
  const [busy, setBusy] = useState(false);
  const readOnly = !canEdit || row.status === "Validé";
  async function saveCorrections() { setBusy(true); await saveQuestionnaireData(row.id, data); setBusy(false); }
  async function validate() { setBusy(true); await validateQuestionnaire(row.id, row.status !== "Validé"); setBusy(false); onClose(); }
  return (
    <Modal title={`Questionnaire ${row.year} — analyse`} onClose={onClose} maxWidth={860}
      footer={canEdit ? <>
        <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
        {row.status !== "Validé" && <button className="btn btn-ghost" disabled={busy} onClick={saveCorrections}>Enregistrer mes corrections</button>}
        <button className="btn btn-primary" disabled={busy} onClick={validate}>{row.status === "Validé" ? "Rouvrir" : "Valider le questionnaire"}</button>
      </> : <button className="btn btn-ghost" onClick={onClose}>Fermer</button>}>
      {row.status === "Brouillon" || row.status === "Envoyé" ? (
        <div style={{ fontSize: 12.5, color: "var(--text-2)", padding: "8px 0 14px" }}>L&apos;entrepreneur n&apos;a pas encore renvoyé ses réponses. Vous verrez ici ce qu&apos;il aura saisi.</div>
      ) : null}
      <QuestionnaireForm initial={data} readOnly={readOnly} onSubmit={readOnly ? undefined : async (d) => { setData(d); await saveQuestionnaireData(row.id, d); }} submitLabel="Enregistrer" />
    </Modal>
  );
}
