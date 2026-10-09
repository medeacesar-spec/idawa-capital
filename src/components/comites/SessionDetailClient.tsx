"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CItem, CMember, SessionDetail, SessionOptions } from "@/lib/data/committees";
import { COMMITTEE_DECISION_STYLE, COMPANY_COMMITTEE_OUTCOMES, DEAL_COMMITTEE_OUTCOMES, SUPPORT_COMMITTEE_OUTCOMES } from "@/lib/ui-constants";
import { openDocument } from "@/lib/doc-links";
import CommitteeFormModal from "@/components/pipeline/CommitteeFormModal";
import SessionFormModal from "./SessionFormModal";
import SharePointPicker from "./SharePointPicker";
import { STATUS_STYLE, frDate } from "./SessionsClient";
import {
  addItem, addMember, addSharePointDocuments, closeSession, deleteSession, inviteMember, linkDecision,
  openSession, postStaffComment, registerUploadedDocument, removeDocument, removeItem, removeMember,
} from "@/app/(app)/comites/actions";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const stamp = (d: string) => { const x = new Date(d); return `${x.getDate()} ${MONTHS[x.getMonth()]} ${String(x.getHours()).padStart(2, "0")}h${String(x.getMinutes()).padStart(2, "0")}`; };
const fmtSize = (n: number | null) => n == null ? "" : n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1048576).toFixed(1).replace(".", ",")} Mo`;
const safeName = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
const errOf = (r: object) => ("error" in r ? (r as { error: string }).error : null);

const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".05em" };
const inputStyle: React.CSSProperties = { padding: "8px 11px", border: "1px solid var(--border-strong)", borderRadius: 9, fontSize: 12.5, fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)", minWidth: 0 };

function OpinionBadge({ value, conflict }: { value: string | null; conflict?: boolean }) {
  if (conflict) return <span className="badge" style={{ background: "#EDE7F3", color: "#5B4A7A" }}>Conflit d&apos;intérêts</span>;
  if (!value) return <span style={{ fontSize: 12, color: "var(--text-3)" }}>—</span>;
  const s = COMMITTEE_DECISION_STYLE[value];
  return <span className="badge" style={{ background: s.bg, color: s.fg }}>{value}</span>;
}

function memberState(m: CMember): { text: string; color: string } {
  if (m.revokedAt) return { text: "Accès retiré", color: "var(--text-3)" };
  if (!m.invitedAt) return { text: "Pas encore invité", color: "var(--text-3)" };
  if (m.lastSeenAt && m.acceptedAt) return { text: `A consulté · dernière visite ${stamp(m.lastSeenAt)}`, color: "#3B6D11" };
  return { text: `Invité le ${stamp(m.invitedAt)} · pas encore ouvert`, color: "#8A5A12" };
}

/** Synthèse des avis, proposée dans le compte rendu de la décision. */
function synthesis(item: CItem, members: CMember[]): string {
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "Membre";
  const counts = new Map<string, number>();
  for (const o of item.opinions) { const k = o.conflict ? "conflit d'intérêts" : o.opinion ?? ""; if (k) counts.set(k, (counts.get(k) ?? 0) + 1); }
  const head = `Avis consultatifs des membres : ${Array.from(counts).map(([k, n]) => `${k} ${n}`).join(", ") || "aucun"}.`;
  const lines = item.opinions.map((o) => `- ${name(o.memberId)} : ${o.conflict ? "conflit d'intérêts, ne se prononce pas" : o.opinion ?? "—"}${o.conditions ? ` (conditions : ${o.conditions})` : ""}${o.comment ? ` — ${o.comment}` : ""}`);
  return [head, ...lines].join("\n");
}

function ItemCard({ item, index, session, canEdit, programCommittees }: {
  item: CItem; index: number; session: SessionDetail; canEdit: boolean; programCommittees: SessionOptions["programCommittees"];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(index === 0);
  const [picker, setPicker] = useState(false);
  const [decision, setDecision] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const closed = session.status === "Close";
  const active = session.members.filter((m) => !m.revokedAt);
  const given = item.opinions.filter((o) => o.opinion || o.conflict).length;

  async function run(p: Promise<object>) {
    setBusy(true); setErr(null);
    const r = await p;
    setBusy(false);
    const e = errOf(r);
    if (e) setErr(e); else router.refresh();
    return e;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErr(null);
    const path = `comites/${session.id}/${item.id}/${Date.now()}-${safeName(file.name)}`;
    const up = await createClient().storage.from("documents").upload(path, file);
    if (up.error) { setErr(`Téléversement impossible : ${up.error.message}`); setBusy(false); return; }
    await run(registerUploadedDocument(item.id, file.name, path, file.size));
    if (fileRef.current) fileRef.current.value = "";
  }

  const outcomes = item.entityType === "deal" ? DEAL_COMMITTEE_OUTCOMES : item.equity ? COMPANY_COMMITTEE_OUTCOMES : SUPPORT_COMMITTEE_OUTCOMES;

  return (
    <div className="card" style={{ padding: "4px 18px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", flexWrap: "wrap" }}>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
          style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 240px", minWidth: 0, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
          <span style={{ width: 10, fontSize: 9, color: "var(--text-3)", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{index + 1}. {item.name}</span>
          {item.sector && <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>· {item.sector}</span>}
        </button>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{item.documents.length} pièce{item.documents.length > 1 ? "s" : ""} · avis {given}/{active.length} · {item.comments.length} échange{item.comments.length > 1 ? "s" : ""}</span>
        {item.passageId
          ? <span className="badge" style={{ background: COMMITTEE_DECISION_STYLE[item.passageDecision ?? ""]?.bg ?? "var(--surface-cream)", color: COMMITTEE_DECISION_STYLE[item.passageDecision ?? ""]?.fg ?? "var(--text-2)" }}>Décision : {item.passageDecision} · {item.passageStatus}</span>
          : null}
        <Link href={item.href} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11.5 }}>Fiche</Link>
      </div>

      {open && (
        <div style={{ paddingBottom: 14 }}>
          {err && <div style={{ fontSize: 12.5, color: "var(--red-fg, #A6412E)", marginBottom: 8 }}>{err}</div>}

          {/* Pièces */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", margin: "4px 0 6px" }}>
            <span style={label}>Dossier de séance</span>
            {canEdit && !closed && (
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-ghost" disabled={busy || !item.hasFolder} title={item.hasFolder ? "" : "Aucun dossier SharePoint rattaché à la fiche"} onClick={() => setPicker(true)}>Depuis SharePoint</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => fileRef.current?.click()}>Téléverser</button>
                <input ref={fileRef} type="file" hidden onChange={onFile} />
              </div>
            )}
          </div>
          {item.documents.length === 0 && <div style={{ fontSize: 12.5, color: "var(--text-3)", padding: "4px 0 8px" }}>Aucune pièce. Ajoutez la note d&apos;investissement, le modèle financier…</div>}
          {item.documents.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 2px", borderTop: "1px solid var(--sep)" }}>
              <button onClick={() => openDocument({ storagePath: d.storagePath })} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "var(--espresso)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</button>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>{fmtSize(d.size)}</span>
              {canEdit && !closed && <button className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: 11 }} disabled={busy} onClick={() => confirm(`Retirer « ${d.name} » du dossier de séance ?`) && run(removeDocument(d.id))}>Retirer</button>}
            </div>
          ))}

          {/* Avis */}
          <div style={{ ...label, margin: "16px 0 6px" }}>Avis des membres (consultatifs)</div>
          {active.map((m) => {
            const o = item.opinions.find((x) => x.memberId === m.id);
            return (
              <div key={m.id} style={{ padding: "7px 2px", borderTop: "1px solid var(--sep)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--ink)" }}>{m.name}{m.organization ? <span style={{ color: "var(--text-3)" }}> · {m.organization}</span> : null}</span>
                  <OpinionBadge value={o?.opinion ?? null} conflict={o?.conflict} />
                </div>
                {o?.conditions && <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 3 }}>Conditions : {o.conditions}</div>}
                {o?.comment && <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 3, whiteSpace: "pre-wrap" }}>{o.comment}</div>}
              </div>
            );
          })}

          {/* Échanges */}
          <div style={{ ...label, margin: "16px 0 6px" }}>Questions et échanges</div>
          {item.comments.length === 0 && <div style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 6 }}>Aucun échange.</div>}
          {item.comments.map((c) => (
            <div key={c.id} style={{ padding: "8px 12px", marginBottom: 6, borderRadius: 10, background: c.fromIdawa ? "var(--surface-cream)" : "var(--surface)", border: "1px solid var(--sep)" }}>
              <div style={{ fontSize: 11.5, color: "var(--text-3)", marginBottom: 3 }}><b style={{ color: "var(--ink)" }}>{c.authorName}</b> · {stamp(c.createdAt)}</div>
              <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{c.body}</div>
            </div>
          ))}
          {canEdit && session.status === "Ouverte" && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Répondre au nom d'Idawa Capital (visible par les membres)" style={{ ...inputStyle, flex: 1, minHeight: 44, resize: "vertical" }} />
              <button className="btn btn-ghost" disabled={busy || !reply.trim()} onClick={async () => { if (!(await run(postStaffComment(item.id, reply)))) setReply(""); }}>Envoyer</button>
            </div>
          )}

          {/* Décision */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--sep)" }}>
            <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>
              {item.passageId ? <>Décision enregistrée ({item.passageStatus === "Validée" ? "validée par la Direction" : "en attente de validation par la Direction"}).</> : "La décision est arrêtée par Idawa au vu des avis, puis validée par la Direction."}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {canEdit && session.status === "Ouverte" && !item.passageId && <button className="btn btn-primary" onClick={() => setDecision(true)}>Enregistrer la décision</button>}
              {canEdit && session.status === "Préparation" && <button className="btn btn-ghost" disabled={busy} onClick={() => confirm(`Retirer ${item.name} de l'ordre du jour ?`) && run(removeItem(item.id))}>Retirer de l&apos;ordre du jour</button>}
            </div>
          </div>
        </div>
      )}

      {picker && (
        <SharePointPicker entityType={item.entityType} entityId={item.entityId} entityName={item.name} onClose={() => setPicker(false)}
          onConfirm={async (ids) => { const r = await addSharePointDocuments(item.id, ids); const e = errOf(r); if (!e) router.refresh(); return e; }} />
      )}
      {decision && (
        <CommitteeFormModal
          dealId={item.entityType === "deal" ? item.entityId : undefined}
          companyId={item.entityType === "company" ? item.entityId : undefined}
          dealStage={item.entityType === "deal" ? item.stage ?? undefined : undefined}
          outcomes={outcomes}
          programCommittees={programCommittees}
          defaultType={session.committeeType}
          passage={null}
          prefill={{ sessionDate: session.sessionDate, participants: active.map((m) => m.name).join(", "), conditions: synthesis(item, session.members) }}
          onSaved={(pid) => linkDecision(item.id, pid)}
          onClose={() => { setDecision(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

export default function SessionDetailClient({ session, options, canEdit }: { session: SessionDetail; options: SessionOptions; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [entityPick, setEntityPick] = useState("");
  const [contactPick, setContactPick] = useState("");
  const [newMember, setNewMember] = useState<{ name: string; email: string; organization: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const st = STATUS_STYLE[session.status];
  const active = session.members.filter((m) => !m.revokedAt);
  const expected = active.length * session.items.length;
  const given = session.items.reduce((n, i) => n + i.opinions.filter((o) => (o.opinion || o.conflict) && active.some((m) => m.id === o.memberId)).length, 0);
  const decided = session.items.filter((i) => i.passageId).length;
  const onAgenda = new Set(session.items.map((i) => `${i.entityType}:${i.entityId}`));
  const memberContacts = new Set(session.members.map((m) => m.contactId));

  async function run(p: Promise<object>, ok?: string) {
    setBusy(true); setMsg(null);
    const r = await p;
    setBusy(false);
    const e = errOf(r);
    setMsg(e ? { text: e, error: true } : ok ? { text: ok } : null);
    if (!e) router.refresh();
    return r;
  }

  async function copyLink(m: CMember) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/c/${m.token}`); setMsg({ text: `Lien de ${m.name} copié.` }); }
    catch { setMsg({ text: `${window.location.origin}/c/${m.token}` }); }
  }

  return (
    <div>
      <Link href="/comites" style={{ fontSize: 12.5, color: "var(--text-2)", textDecoration: "none" }}>← Toutes les séances</Link>

      {/* En-tête */}
      <div className="card" style={{ padding: "18px 20px", margin: "10px 0 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--camel)", textTransform: "uppercase", letterSpacing: ".05em" }}>{session.committeeType}</div>
            <div className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)", margin: "3px 0 6px" }}>{session.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
              Séance {frDate(session.sessionDate)} · avis attendus avant le <b>{frDate(session.opinionDeadline)}</b>
              {session.status !== "Préparation" && <> · avis reçus <b>{given} / {expected}</b> · décisions {decided} / {session.items.length}</>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="badge" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
            {canEdit && session.status !== "Close" && <button className="btn btn-ghost" onClick={() => setEditing(true)}>Modifier</button>}
            {canEdit && session.status === "Préparation" && <button className="btn btn-ghost" disabled={busy} onClick={async () => { if (confirm("Supprimer cette séance ?")) { const r = await run(deleteSession(session.id)); if (!errOf(r)) router.push("/comites"); } }}>Supprimer</button>}
            {canEdit && session.status === "Préparation" && (
              <button className="btn btn-primary" disabled={busy} onClick={() => confirm(`Ouvrir la séance ? Chaque membre (${active.length}) recevra son lien personnel par e-mail.`) && run(openSession(session.id)).then((r) => {
                if (!errOf(r) && "sent" in r) { const x = r as { sent: number; total: number }; setMsg({ text: `Séance ouverte : ${x.sent} e-mail${x.sent > 1 ? "s" : ""} envoyé${x.sent > 1 ? "s" : ""} sur ${x.total}.${x.sent < x.total ? " Copiez le lien des autres membres ci-dessous." : ""}` }); }
              })}>Ouvrir la séance et inviter</button>
            )}
            {canEdit && session.status === "Ouverte" && (
              <button className="btn btn-primary" disabled={busy || decided < session.items.length} title={decided < session.items.length ? "Enregistrez d'abord la décision de chaque dossier" : ""}
                onClick={() => confirm("Clôturer la séance ? Les membres n'auront plus accès au dossier.") && run(closeSession(session.id), "Séance close.")}>Clôturer la séance</button>
            )}
          </div>
        </div>
        {msg && <div style={{ marginTop: 10, fontSize: 12.5, color: msg.error ? "var(--red-fg, #A6412E)" : "#3B6D11", wordBreak: "break-all" }}>{msg.text}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)", gap: 14, alignItems: "start" }} className="comite-grid">
        {/* Ordre du jour */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={label}>Ordre du jour</span>
            {canEdit && session.status !== "Close" && (
              <div style={{ display: "flex", gap: 6 }}>
                <input list="comite-entities" value={entityPick} onChange={(e) => setEntityPick(e.target.value)} placeholder="Ajouter un dossier ou une société…" style={{ ...inputStyle, width: 250 }} />
                <datalist id="comite-entities">
                  {options.entities.filter((e) => !onAgenda.has(`${e.type}:${e.id}`)).map((e) => <option key={`${e.type}:${e.id}`} value={`${e.name}${e.type === "company" ? " (portefeuille)" : ""}`} />)}
                </datalist>
                <button className="btn btn-ghost" disabled={busy || !entityPick} onClick={async () => {
                  const e = options.entities.find((x) => `${x.name}${x.type === "company" ? " (portefeuille)" : ""}` === entityPick);
                  if (!e) { setMsg({ text: "Choisissez un nom dans la liste.", error: true }); return; }
                  const r = await run(addItem(session.id, e.type, e.id)); if (!errOf(r)) setEntityPick("");
                }}>Ajouter</button>
              </div>
            )}
          </div>
          {session.items.length === 0 && <div className="card" style={{ padding: 22, textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Aucun dossier à l&apos;ordre du jour.</div>}
          {session.items.map((it, i) => <ItemCard key={it.id} item={it} index={i} session={session} canEdit={canEdit} programCommittees={options.programCommittees} />)}
        </div>

        {/* Membres */}
        <div className="card" style={{ padding: "14px 16px" }}>
          <div style={{ ...label, marginBottom: 8 }}>Membres ({active.length})</div>
          {session.members.length === 0 && <div style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 8 }}>Aucun membre invité.</div>}
          {session.members.map((m) => {
            const s = memberState(m);
            return (
              <div key={m.id} style={{ padding: "8px 0", borderTop: "1px solid var(--sep)", opacity: m.revokedAt ? 0.6 : 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{m.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{[m.organization, m.email].filter(Boolean).join(" · ")}</div>
                <div style={{ fontSize: 11.5, color: s.color, marginTop: 2 }}>{s.text}</div>
                {canEdit && !m.revokedAt && session.status !== "Close" && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {session.status === "Ouverte" && <button className="btn btn-ghost" style={{ padding: "3px 9px", fontSize: 11 }} onClick={() => copyLink(m)}>Copier le lien</button>}
                    {session.status === "Ouverte" && <button className="btn btn-ghost" style={{ padding: "3px 9px", fontSize: 11 }} disabled={busy} onClick={() => run(inviteMember(m.id)).then((r) => { if (!errOf(r)) setMsg({ text: (r as { emailed: boolean }).emailed ? `Invitation renvoyée à ${m.name}.` : `E-mail non envoyé : copiez le lien de ${m.name}.`, error: !(r as { emailed: boolean }).emailed }); })}>{m.invitedAt ? "Renvoyer" : "Inviter"}</button>}
                    <button className="btn btn-ghost" style={{ padding: "3px 9px", fontSize: 11 }} disabled={busy} onClick={() => confirm(m.invitedAt ? `Couper l'accès de ${m.name} ? Ses avis déjà donnés restent visibles.` : `Retirer ${m.name} ?`) && run(removeMember(m.id))}>Retirer</button>
                  </div>
                )}
              </div>
            );
          })}
          {canEdit && session.status !== "Close" && (
            <div style={{ borderTop: "1px solid var(--sep)", paddingTop: 10, marginTop: 4 }}>
              {newMember ? (
                <div style={{ display: "grid", gap: 6 }}>
                  <input value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} placeholder="Nom et prénom" style={inputStyle} />
                  <input value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} placeholder="E-mail" type="email" style={inputStyle} />
                  <input value={newMember.organization} onChange={(e) => setNewMember({ ...newMember, organization: e.target.value })} placeholder="Organisation (facultatif)" style={inputStyle} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-primary" disabled={busy || !newMember.name.trim() || !newMember.email.trim()} onClick={async () => { const r = await run(addMember(session.id, newMember)); if (!errOf(r)) setNewMember(null); }}>Ajouter</button>
                    <button className="btn btn-ghost" onClick={() => setNewMember(null)}>Annuler</button>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>Le membre est aussi ajouté aux Contacts (« Membre de comité »).</div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select value={contactPick} onChange={(e) => setContactPick(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                      <option value="">Choisir un contact…</option>
                      {[true, false].map((isMember) => {
                        const list = options.contacts.filter((c) => c.isMember === isMember && !memberContacts.has(c.id));
                        return list.length ? (
                          <optgroup key={String(isMember)} label={isMember ? "Membres de comité" : "Autres contacts"}>
                            {list.map((c) => <option key={c.id} value={c.id}>{c.name}{c.organization ? ` — ${c.organization}` : ""}</option>)}
                          </optgroup>
                        ) : null;
                      })}
                    </select>
                    <button className="btn btn-ghost" disabled={busy || !contactPick} onClick={async () => { const r = await run(addMember(session.id, { contactId: contactPick })); if (!errOf(r)) setContactPick(""); }}>Ajouter</button>
                  </div>
                  <button onClick={() => setNewMember({ name: "", email: "", organization: "" })} style={{ background: "none", border: "none", padding: 0, marginTop: 8, color: "var(--camel)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Nouveau membre (pas encore dans les contacts)</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .comite-grid { grid-template-columns: minmax(0, 1fr) !important; } }`}</style>

      {editing && (
        <SessionFormModal sessionId={session.id} programCommittees={options.programCommittees.map((c) => c.name)} onClose={() => setEditing(false)}
          initial={{ committeeType: session.committeeType, title: session.title, sessionDate: session.sessionDate, opinionDeadline: session.opinionDeadline }} />
      )}
    </div>
  );
}
