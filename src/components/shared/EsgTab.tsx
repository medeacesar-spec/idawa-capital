"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { EHS_SECTORS, ESG_RISK_LEVELS, ESG_RISK_LABEL, ESG_ACTION_CATEGORIES, ESG_CATEGORY_LABEL, ESG_ACTION_STATUS, ESG_IMPACT_DIMENSIONS } from "@/lib/ui-constants";
import type { EsgData, EsgAssessment, EsgAction, EsgImpact } from "@/lib/data/esg";
import ImpactRatingModal from "./ImpactRatingModal";
import ImpactQuestionnaireSection from "@/components/impact/ImpactQuestionnaireSection";
import { BASE_MAX, BONUS_LABEL, noteOnThree } from "@/lib/esg/impactRating";
import type { FundUser } from "@/lib/data/users";
import { useCanEdit } from "./WriteAccess";
import { notifyAssignment } from "@/app/(app)/notify-actions";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDate(d: string | null) { if (!d) return "—"; return `${d.slice(8, 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`; }
const RISK_COLOR: Record<string, string> = { C: "badge-green", B: "badge-amber", A: "badge-red" };
const STATUS_COLOR: Record<string, string> = { "Réalisée": "badge-green", "En cours": "badge-amber", "À lancer": "badge-red" };
const CAT_COLOR: Record<string, string> = { E: "#3B6D11", S: "#185FA5", G: "#8A5A18" };
function isOverdue(a: EsgAction) { return a.status !== "Réalisée" && !!a.dateEndPlan && a.dateEndPlan < new Date().toISOString().slice(0, 10); }

export default function EsgTab({ entityType, entityId, data, users, ehsSector, companyId }: {
  entityType: "deal" | "company"; entityId: string; data: EsgData; users: FundUser[];
  /** Secteur EHS de la société : le diagnostic E&S s'appuie dessus. Absent sur un dossier. */
  ehsSector?: string | null;
  companyId?: string;
}) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const [diagOpen, setDiagOpen] = useState(false);
  const [actModal, setActModal] = useState<{ open: boolean; action: EsgAction | null }>({ open: false, action: null });
  const [ratingOpen, setRatingOpen] = useState(false);

  const a = data.assessment;
  // Les bonus s'ajoutent par-dessus la note de base : les additionner au maximum
  // donnerait un « 34 / 34 » qui ne veut rien dire.
  const baseRows = data.impacts.filter((i) => i.dimension !== BONUS_LABEL);
  const impactScore = baseRows.reduce((s, i) => s + (i.score ?? 0), 0);
  const impactMax = baseRows.reduce((s, i) => s + (i.maxScore ?? 0), 0);
  const impactBonus = data.impacts.filter((i) => i.dimension === BONUS_LABEL).reduce((s, i) => s + (i.score ?? 0), 0);

  async function delAction(id: string) { if (!confirm("Supprimer cette action ESG ?")) return; await createClient().from("esg_actions").delete().eq("id", id); router.refresh(); }

  async function saveEhs(value: string) {
    if (!companyId) return;
    await createClient().from("portfolio_companies").update({ ehs_sector: value || null }).eq("id", companyId);
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {companyId && (
        <section className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
            Classification E&S <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— secteur IFC, socle du diagnostic</span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-2)", marginBottom: 10 }}>
            Le secteur précis détermine les normes de performance applicables et les risques à examiner.
          </div>
          <Select disabled={!canEdit} defaultValue={ehsSector ?? ""} onChange={(e) => saveEhs(e.target.value)}>
            <option value="">— Non défini —</option>
            {EHS_SECTORS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((x) => <option key={x} value={x}>{x}</option>)}
              </optgroup>
            ))}
            {!!ehsSector && !EHS_SECTORS.some((g) => g.items.includes(ehsSector)) && <option value={ehsSector}>{ehsSector}</option>}
          </Select>
        </section>
      )}

      {/* Diagnostic */}
      <section className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: a ? 12 : 0, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Diagnostic E&S <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— méthodologie I&P / IPDEV 2, normes IFC</span></div>
          {canEdit && (<button className="btn btn-ghost" onClick={() => setDiagOpen(true)}>{a ? "Modifier le diagnostic" : "Renseigner le diagnostic"}</button>)}
        </div>
        {a && (
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 11, color: "var(--text-3)" }}>Catégorie de risque</div>{a.riskCategory ? <span className={`badge ${RISK_COLOR[a.riskCategory] ?? "badge-neutral"}`} style={{ marginTop: 4, display: "inline-block" }}>{ESG_RISK_LABEL[a.riskCategory] ?? a.riskCategory}</span> : <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>—</div>}</div>
            <div><div style={{ fontSize: 11, color: "var(--text-3)" }}>Liste d'exclusion</div><div style={{ fontSize: 12.5, fontWeight: 600, color: a.exclusionOk ? "var(--green-fg)" : "var(--red-fg)", marginTop: 5 }}>{a.exclusionOk ? "Conforme" : "À vérifier"}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--text-3)" }}>Secteur EHS</div><div style={{ fontSize: 12.5, color: "var(--ink)", marginTop: 5 }}>{a.ehsSector || "—"}</div></div>
          </div>
        )}
      </section>

      {/* Plan d'action ESAP */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Plan d'action E&S (ESAP) <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— responsable, échéance, statut</span></div>
          {canEdit && (<button className="btn btn-primary" onClick={() => setActModal({ open: true, action: null })}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Ajouter une action
          </button>)}
        </div>
        {data.actions.length === 0 ? (
          <div className="card" style={{ padding: "22px", textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>Aucune action ESG. Renseignez le plan d'action E&S de la société.</div>
        ) : (
          <div className="card" style={{ padding: "4px 18px" }}>
            {data.actions.map((ac, i) => (
              <div key={ac.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
                <span title={ESG_CATEGORY_LABEL[ac.category ?? ""] ?? ""} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: `${CAT_COLOR[ac.category ?? ""] ?? "#6B5744"}1a`, color: CAT_COLOR[ac.category ?? ""] ?? "#6B5744", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{ac.category ?? "?"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>{ac.action}</div>
                  <div style={{ fontSize: 11, color: isOverdue(ac) ? "var(--red-fg)" : "var(--text-3)" }}>{ac.responsibleCode ? ac.responsibleCode : "Non assignée"}{ac.dateEndPlan ? ` · échéance ${frDate(ac.dateEndPlan)}` : ac.createdAt ? ` · ajoutée le ${frDate(ac.createdAt)}` : ""}{isOverdue(ac) ? " · en retard" : ""}</div>
                </div>
                {ac.status && <span className={`badge ${STATUS_COLOR[ac.status] ?? "badge-neutral"}`}>{ac.status}</span>}
                <div className="row-actions" style={{ display: canEdit ? undefined : "none" }}>
                  <button onClick={() => setActModal({ open: true, action: ac })} aria-label="Modifier"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
                  <button onClick={() => delAction(ac.id)} aria-label="Supprimer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Impact */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            Rating d&apos;impact{" "}
            <span style={{ fontWeight: 400, color: "var(--text-3)" }}>
              (IPDEV 2){impactMax > 0 ? ` — ${impactScore} / ${impactMax}` : ""}
              {impactBonus !== 0 ? ` · bonus ${impactBonus > 0 ? "+" : ""}${impactBonus}` : ""}
              {impactMax > 0 ? ` · note comité ${noteOnThree(impactScore)}/3` : ""}
            </span>
          </div>
          {canEdit && (<button className="btn btn-ghost" onClick={() => setRatingOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
            {data.impacts.length ? "Revoir la notation" : "Noter l'impact"}
          </button>)}
        </div>
        {data.impacts.length === 0 ? (
          <div className="card" style={{ padding: "22px", textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>Impact non noté. La grille IPDEV 2 se remplit critère par critère, le total se calcule.</div>
        ) : (
          <div className="card" style={{ padding: "14px 20px", display: "grid", gap: 10 }}>
            {data.impacts.map((im) => {
              const isBonus = im.dimension === BONUS_LABEL;
              const pct = im.maxScore ? Math.round(((im.score ?? 0) / im.maxScore) * 100) : 0;
              if (isBonus) {
                if (!im.score) return null;
                return (
                  <div key={im.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, paddingTop: 4, borderTop: "1px solid var(--sep)" }}>
                    <span style={{ color: "var(--text-2)" }}>Bonus et malus <span style={{ color: "var(--text-3)" }}>(hors note sur {BASE_MAX})</span></span>
                    <span className="tnum" style={{ fontWeight: 600, color: (im.score ?? 0) < 0 ? "var(--red-fg)" : "var(--green-fg)" }}>{(im.score ?? 0) > 0 ? "+" : ""}{im.score}</span>
                  </div>
                );
              }
              return (
                <div key={im.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                      <span style={{ color: "var(--text-2)" }}>{im.dimension}</span>
                      <span className="tnum" style={{ fontWeight: 600, color: "var(--ink)" }}>{im.score ?? 0}/{im.maxScore ?? 0}</span>
                    </div>
                    <div style={{ height: 5, background: "var(--cream)", borderRadius: 3 }}><div style={{ width: `${pct}%`, height: "100%", background: "#3B6D11", borderRadius: 3 }} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ImpactQuestionnaireSection entityType={entityType} entityId={entityId} />

      {diagOpen && <DiagModal entityType={entityType} entityId={entityId} assessment={a} onClose={() => setDiagOpen(false)} />}
      {actModal.open && <ActionModal entityType={entityType} entityId={entityId} action={actModal.action} users={users} onClose={() => setActModal({ open: false, action: null })} />}
      {ratingOpen && <ImpactRatingModal entityType={entityType} entityId={entityId} impacts={data.impacts} onClose={() => setRatingOpen(false)} />}
    </div>
  );

  function DiagModal({ entityType, entityId, assessment, onClose }: { entityType: "deal" | "company"; entityId: string; assessment: EsgAssessment | null; onClose: () => void }) {
    const [busy, setBusy] = useState(false);
    const [risk, setRisk] = useState(assessment?.riskCategory ?? ESG_RISK_LEVELS[0]);
    const [excl, setExcl] = useState(assessment?.exclusionOk ?? true);
    const [sector, setSector] = useState(assessment?.ehsSector ?? "");
    async function save() {
      setBusy(true);
      const supabase = createClient();
      const payload = { entity_type: entityType, entity_id: entityId, risk_category: risk, exclusion_ok: excl, ehs_sector: sector.trim() || null };
      if (assessment) await supabase.from("esg_assessments").update(payload).eq("id", assessment.id);
      else await supabase.from("esg_assessments").insert(payload);
      onClose(); router.refresh();
    }
    return (
      <Modal title="Diagnostic E&S" onClose={onClose}
        footer={<><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer"}</button></>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Catégorie de risque"><Select value={risk} onChange={(e) => setRisk(e.target.value)}>{ESG_RISK_LEVELS.map((r) => <option key={r} value={r}>{ESG_RISK_LABEL[r]}</option>)}</Select></Field>
          <Field label="Liste d'exclusion"><Select value={excl ? "1" : "0"} onChange={(e) => setExcl(e.target.value === "1")}><option value="1">Conforme</option><option value="0">À vérifier</option></Select></Field>
        </div>
        <Field label="Secteur EHS"><Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Ex : Volailles, Agroalimentaire…" /></Field>
      </Modal>
    );
  }

  function ActionModal({ entityType, entityId, action, users, onClose }: { entityType: "deal" | "company"; entityId: string; action: EsgAction | null; users: FundUser[]; onClose: () => void }) {
    const [busy, setBusy] = useState(false);
    const [cat, setCat] = useState(action?.category ?? "G");
    const [text, setText] = useState(action?.action ?? "");
    const [resp, setResp] = useState(action?.responsibleCode ?? "");
    const [assigneeId, setAssigneeId] = useState(action?.assigneeId ?? "");
    const [due, setDue] = useState(action?.dateEndPlan ?? "");
    const [status, setStatus] = useState(action?.status ?? ESG_ACTION_STATUS[0]);
    async function save() {
      if (!text.trim()) return;
      setBusy(true);
      const supabase = createClient();
      const payload = { entity_type: entityType, entity_id: entityId, category: cat, action: text.trim(), responsible_code: resp.trim() || null, assignee_id: assigneeId || null, date_end_plan: due || null, status };
      if (action) await supabase.from("esg_actions").update(payload).eq("id", action.id);
      else await supabase.from("esg_actions").insert(payload);
      // Prévenir la personne assignée — uniquement si l'affectation a CHANGÉ :
      // la rappeler à chaque retouche ferait ignorer tous les emails suivants.
      if (assigneeId && assigneeId !== (action?.assigneeId ?? "")) {
        await notifyAssignment({
          kind: "Action E&S", title: text.trim(), assigneeId,
          dueDate: due || null, entityType, entityId,
        });
      }
      onClose(); router.refresh();
    }
    return (
      <Modal title={action ? "Modifier l'action E&S" : "Ajouter une action E&S"} onClose={onClose}
        footer={<><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={busy || !text.trim()} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer"}</button></>}>
        <Field label="Action"><Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex : Formaliser la politique E&S" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Domaine"><Select value={cat} onChange={(e) => setCat(e.target.value)}>{ESG_ACTION_CATEGORIES.map((c) => <option key={c} value={c}>{ESG_CATEGORY_LABEL[c]}</option>)}</Select></Field>
          <Field label="Statut"><Select value={status} onChange={(e) => setStatus(e.target.value)}>{ESG_ACTION_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Responsable"><Input value={resp} onChange={(e) => setResp(e.target.value)} placeholder="Ex : Direction, la société…" /></Field>
          <Field label="Échéance"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <Field label="Suivi par (équipe Idawa)" hint="Reçoit le rappel dans « À faire »"><Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}><option value="">— Personne —</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
      </Modal>
    );
  }
}
