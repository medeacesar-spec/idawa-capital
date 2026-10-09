"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMMITTEE_DECISIONS, COMMITTEE_DECISION_STYLE } from "@/lib/ui-constants";
import { acceptConfidentiality, postComment, saveOpinion } from "./actions";

export type PortalSession = {
  committeeType: string; title: string; sessionDate: string | null; opinionDeadline: string; status: "Préparation" | "Ouverte" | "Close";
  members: { id: string; name: string; organization: string | null }[];
  items: {
    id: string; name: string; summary: string | null; sector: string | null;
    documents: { id: string; name: string; size: number | null }[];
    opinions: { memberId: string; conflict: boolean; opinion: string | null; conditions: string | null; comment: string | null; updatedAt: string }[];
    comments: { id: string; authorName: string; fromIdawa: boolean; memberId: string | null; body: string; createdAt: string }[];
  }[];
};

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const longDate = (d: string) => `${parseInt(d.slice(8, 10), 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1]} ${d.slice(0, 4)}`;
const SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const stamp = (d: string) => { const x = new Date(d); return `${x.getDate()} ${SHORT[x.getMonth()]} à ${String(x.getHours()).padStart(2, "0")}h${String(x.getMinutes()).padStart(2, "0")}`; };
const fmtSize = (n: number | null) => n == null ? "" : n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1048576).toFixed(1).replace(".", ",")} Mo`;

const OPINION_STYLE = COMMITTEE_DECISION_STYLE;
function OpinionBadge({ value, conflict }: { value: string | null; conflict?: boolean }) {
  if (conflict) return <span className="badge" style={{ background: "#EDE7F3", color: "#5B4A7A" }}>Conflit d&apos;intérêts — se retire</span>;
  if (!value) return <span style={{ fontSize: 12, color: "var(--text-3)" }}>Pas encore d&apos;avis</span>;
  const s = OPINION_STYLE[value];
  return <span className="badge" style={{ background: s.bg, color: s.fg }}>{value}</span>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--cream, #FAF6F0)", padding: "28px 16px 60px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--espresso)", letterSpacing: ".5px", marginBottom: 18 }}>IDAWA CAPITAL</div>
        {children}
      </div>
    </div>
  );
}

const textarea: React.CSSProperties = { width: "100%", minHeight: 70, padding: "9px 12px", border: "1px solid var(--border-strong)", borderRadius: 9, fontSize: 13, fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)", resize: "vertical", boxSizing: "border-box" };

function ItemCard({ token, meId, item, members, index }: { token: string; meId: string; item: PortalSession["items"][number]; members: PortalSession["members"]; index: number }) {
  const router = useRouter();
  const mine = item.opinions.find((o) => o.memberId === meId);
  const [conflict, setConflict] = useState(mine?.conflict ?? false);
  const [opinion, setOpinion] = useState<string | null>(mine?.opinion ?? null);
  const [conditions, setConditions] = useState(mine?.conditions ?? "");
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  async function save() {
    setBusy(true); setErr(null); setSaved(null);
    const r = await saveOpinion(token, item.id, { conflict, opinion, conditions, comment });
    setBusy(false);
    if (r.error) setErr(r.error); else { setSaved("Avis enregistré."); router.refresh(); }
  }
  async function send() {
    if (!msg.trim()) return;
    setBusy(true); setErr(null);
    const r = await postComment(token, item.id, msg);
    setBusy(false);
    if (r.error) setErr(r.error); else { setMsg(""); router.refresh(); }
  }

  const others = members.filter((m) => m.id !== meId);
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name ?? "Membre";

  return (
    <div className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h2 className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{index + 1}. {item.name}</h2>
        {item.sector && <span style={{ fontSize: 12, color: "var(--text-3)" }}>{item.sector}</span>}
      </div>
      {item.summary && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, whiteSpace: "pre-wrap", ...(showSummary ? {} : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }) }}>{item.summary}</div>
          {item.summary.length > 240 && <button onClick={() => setShowSummary((s) => !s)} style={{ background: "none", border: "none", padding: 0, marginTop: 4, color: "var(--camel)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{showSummary ? "Réduire" : "Lire la suite"}</button>}
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".04em", margin: "16px 0 6px" }}>Documents</div>
      {item.documents.length ? item.documents.map((d) => (
        <a key={d.id} href={`/api/c/${token}/doc/${d.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px", borderTop: "1px solid var(--sep)", textDecoration: "none" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--camel)" strokeWidth="1.7" strokeLinejoin="round"><path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /></svg>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--espresso)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>{fmtSize(d.size)} · Télécharger</span>
        </a>
      )) : <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Aucun document pour ce dossier.</div>}

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".04em", margin: "18px 0 8px" }}>Votre avis</div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink)", marginBottom: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={conflict} onChange={(e) => setConflict(e.target.checked)} />
        Je déclare un conflit d&apos;intérêts sur ce dossier et je ne me prononce pas
      </label>
      {!conflict && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {COMMITTEE_DECISIONS.map((d) => {
            const on = opinion === d, s = OPINION_STYLE[d];
            return (
              <button key={d} onClick={() => setOpinion(d)} aria-pressed={on}
                style={{ padding: "8px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  background: on ? s.bg : "var(--surface)", color: on ? s.fg : "var(--text-2)", border: `1.5px solid ${on ? s.fg : "var(--border-strong)"}` }}>{d}</button>
            );
          })}
        </div>
      )}
      {!conflict && opinion === "Favorable sous conditions" && (
        <textarea value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="Vos conditions" style={{ ...textarea, marginBottom: 8 }} />
      )}
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Commentaire (facultatif) : motivation, points d'attention…" style={textarea} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <button className="btn btn-primary" disabled={busy || (!conflict && !opinion)} onClick={save}>{busy ? "Enregistrement…" : mine ? "Mettre à jour mon avis" : "Enregistrer mon avis"}</button>
        {saved && <span style={{ fontSize: 12, color: "#3B6D11" }}>{saved}</span>}
        {err && <span style={{ fontSize: 12, color: "var(--red-fg, #A6412E)" }}>{err}</span>}
      </div>

      {others.length > 0 && (<>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".04em", margin: "18px 0 6px" }}>Avis des autres membres</div>
        {others.map((m) => {
          const o = item.opinions.find((x) => x.memberId === m.id);
          return (
            <div key={m.id} style={{ padding: "8px 2px", borderTop: "1px solid var(--sep)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{m.name}{m.organization ? <span style={{ fontWeight: 400, color: "var(--text-3)" }}> · {m.organization}</span> : null}</span>
                <OpinionBadge value={o?.opinion ?? null} conflict={o?.conflict} />
              </div>
              {o?.conditions && <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 4 }}>Conditions : {o.conditions}</div>}
              {o?.comment && <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 4, whiteSpace: "pre-wrap" }}>{o.comment}</div>}
            </div>
          );
        })}
      </>)}

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".04em", margin: "18px 0 6px" }}>Questions et échanges</div>
      {item.comments.length === 0 && <div style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 8 }}>Aucun échange pour l&apos;instant. Posez vos questions à l&apos;équipe Idawa ici.</div>}
      {item.comments.map((c) => (
        <div key={c.id} style={{ padding: "8px 12px", marginBottom: 6, borderRadius: 10, background: c.fromIdawa ? "var(--surface-cream)" : "var(--surface)", border: "1px solid var(--sep)" }}>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginBottom: 3 }}><b style={{ color: c.fromIdawa ? "var(--espresso)" : "var(--ink)" }}>{c.memberId === meId ? "Vous" : c.fromIdawa ? c.authorName : nameOf(c.memberId)}</b> · {stamp(c.createdAt)}</div>
          <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{c.body}</div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 6 }}>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Votre question ou remarque (visible par les membres et l'équipe Idawa)" style={{ ...textarea, minHeight: 44 }} />
        <button className="btn btn-ghost" disabled={busy || !msg.trim()} onClick={send}>Envoyer</button>
      </div>
    </div>
  );
}

export default function MemberPortalClient({ token, meId, meName, accepted, session }: { token: string; meId: string; meName: string; accepted: boolean; session: PortalSession }) {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const done = session.items.filter((i) => i.opinions.some((o) => o.memberId === meId)).length;

  const header = (
    <div className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--camel)", textTransform: "uppercase", letterSpacing: ".05em" }}>{session.committeeType}</div>
      <h1 className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)", margin: "4px 0 8px" }}>{session.title}</h1>
      <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
        Bonjour {meName}.{session.sessionDate ? <> Séance du <b>{longDate(session.sessionDate)}</b>.</> : null} Avis attendus avant le <b>{longDate(session.opinionDeadline)}</b>.
        <br />Membres : {session.members.map((m) => m.name).join(", ")}.
      </div>
      {accepted && session.status === "Ouverte" && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: done === session.items.length ? "#3B6D11" : "var(--text-2)" }}>
          Vos avis : <b>{done} / {session.items.length}</b> dossier{session.items.length > 1 ? "s" : ""}{done === session.items.length ? " — merci !" : ""}
        </div>
      )}
    </div>
  );

  if (session.status === "Préparation") return <Shell>{header}<div className="card" style={{ padding: 24, textAlign: "center", fontSize: 13.5, color: "var(--text-2)" }}>Le dossier de séance n&apos;est pas encore disponible.</div></Shell>;
  if (session.status === "Close") return <Shell>{header}<div className="card" style={{ padding: 24, textAlign: "center", fontSize: 13.5, color: "var(--text-2)" }}>La séance est close. Merci pour votre participation.</div></Shell>;

  if (!accepted) {
    return (
      <Shell>
        {header}
        <div className="card" style={{ padding: "20px 22px" }}>
          <h2 className="serif" style={{ fontSize: 17, fontWeight: 600, margin: "0 0 10px", color: "var(--ink)" }}>Engagement de confidentialité</h2>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, margin: "0 0 12px" }}>
            Les documents de cette séance contiennent des informations confidentielles sur des entreprises et leurs dirigeants.
            En y accédant, vous vous engagez à les utiliser uniquement pour les travaux du comité, à ne pas les communiquer
            à des tiers et à supprimer les copies téléchargées après la séance. Si vous avez un conflit d&apos;intérêts sur un dossier,
            vous le déclarerez sur ce dossier. Vos consultations et téléchargements sont enregistrés.
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink)", marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> J&apos;accepte cet engagement
          </label>
          <button className="btn btn-primary" disabled={!agree || busy} onClick={async () => { setBusy(true); await acceptConfidentiality(token); router.refresh(); }}>
            {busy ? "…" : "Accéder au dossier de séance"}
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {header}
      {session.items.map((it, i) => <ItemCard key={it.id} token={token} meId={meId} item={it} members={session.members} index={i} />)}
    </Shell>
  );
}
