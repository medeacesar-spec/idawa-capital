"use client";

// Dossier SharePoint de l'entreprise, lu EN DIRECT (rien n'est copié dans l'application).
// Rangement identique à SharePoint : sous-dossiers d'abord, puis fichiers, ordre naturel ;
// chaque sous-dossier se déplie à la demande.

import { useCallback, useEffect, useState } from "react";

type Item = { id: string; name: string; isFolder: boolean; childCount: number | null; size: number | null; webUrl: string; modifiedAt: string | null };
type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "unconfigured"; folderUrl: string | null }
  | { kind: "unlinked" }
  | { kind: "ready"; root: { name: string; webUrl: string }; items: Item[] };

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const frDate = (d: string | null) => { if (!d) return ""; const x = new Date(d); return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`; };
const fmtSize = (n: number | null) => n == null ? "" : n < 1024 ? `${n} o` : n < 1048576 ? `${Math.round(n / 1024)} Ko` : `${(n / 1048576).toFixed(1).replace(".", ",")} Mo`;
// Les fichiers Office s'ouvrent dans le navigateur plutôt que d'être téléchargés.
const openUrl = (it: Item) => /\.(docx?|xlsx?|pptx?)$/i.test(it.name) ? `${it.webUrl}${it.webUrl.includes("?") ? "&" : "?"}web=1` : it.webUrl;

async function fetchFolder(entity: string, id: string, item?: string) {
  const q = new URLSearchParams({ entity, id, ...(item ? { item } : {}) });
  const res = await fetch(`/api/sharepoint/folder?${q}`, { cache: "no-store" });
  const j = await res.json().catch(() => ({ ok: false, error: "Réponse illisible" }));
  if (!j.ok) throw new Error(j.error ?? "Erreur");
  return j;
}

const FolderIcon = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={open ? "var(--accent-soft)" : "none"} stroke="var(--camel)" strokeWidth="1.7" strokeLinejoin="round"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /></svg>
);
const FileIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.7" strokeLinejoin="round"><path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /></svg>
);

function Rows({ entity, id, items, depth }: { entity: string; id: string; items: Item[]; depth: number }) {
  return <>{items.map((it) => <Row key={it.id} entity={entity} id={id} item={it} depth={depth} />)}</>;
}

function Row({ entity, id, item, depth }: { entity: string; id: string; item: Item; depth: number }) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!item.isFolder) return;
    if (!open && children === null) {
      setBusy(true); setErr(null);
      try { setChildren((await fetchFolder(entity, id, item.id)).items); }
      catch (e) { setErr((e as Error).message); }
      setBusy(false);
    }
    setOpen((o) => !o);
  }

  const pad = 4 + depth * 18;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: `8px 4px 8px ${pad}px`, borderTop: "1px solid var(--sep)" }}>
        {item.isFolder ? (
          <button onClick={toggle} aria-expanded={open} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
            <span style={{ width: 10, fontSize: 9, color: "var(--text-3)", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
            <FolderIcon open={open} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
            <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>{busy ? "…" : item.childCount != null ? `${item.childCount} élément${item.childCount > 1 ? "s" : ""}` : ""}</span>
          </button>
        ) : (
          <a href={openUrl(item)} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, textDecoration: "none", paddingLeft: 18 }}>
            <FileIcon />
            <span style={{ fontSize: 13, color: "var(--espresso)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
          </a>
        )}
        {!item.isFolder && <span className="tnum" style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0, textAlign: "right" }}>{fmtSize(item.size)}{item.modifiedAt ? ` · ${frDate(item.modifiedAt)}` : ""}</span>}
      </div>
      {err && <div style={{ padding: `6px 4px 6px ${pad + 28}px`, fontSize: 12, color: "var(--red-fg, #A6412E)" }}>{err}</div>}
      {open && children && (children.length
        ? <Rows entity={entity} id={id} items={children} depth={depth + 1} />
        : <div style={{ padding: `6px 4px 6px ${pad + 28}px`, fontSize: 12, color: "var(--text-3)", borderTop: "1px solid var(--sep)" }}>Dossier vide</div>)}
    </>
  );
}

export default function SharePointFolder({ entityType, entityId, canEdit }: { entityType: "deal" | "company"; entityId: string; canEdit: boolean }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [editing, setEditing] = useState(false);
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const j = await fetchFolder(entityType, entityId);
      if (!j.configured) setState({ kind: "unconfigured", folderUrl: j.folderUrl ?? null });
      else if (!j.linked) setState({ kind: "unlinked" });
      else setState({ kind: "ready", root: j.root, items: j.items });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }, [entityType, entityId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial depuis SharePoint
  useEffect(() => { load(); }, [load]);

  async function saveLink() {
    setSaving(true); setSaveErr(null);
    const res = await fetch("/api/sharepoint/folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: entityType, id: entityId, url: link }) });
    const j = await res.json().catch(() => ({ ok: false, error: "Réponse illisible" }));
    setSaving(false);
    if (!j.ok) { setSaveErr(j.error ?? "Erreur"); return; }
    setEditing(false); setLink("");
    load();
  }

  const header = (title: React.ReactNode, actions?: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>{title}</div>
      <div style={{ display: "flex", gap: 8 }}>{actions}</div>
    </div>
  );

  const linkForm = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Collez le lien du dossier de l'entreprise (site Idawa Capital)"
        style={{ flex: "1 1 280px", minWidth: 0, padding: "8px 12px", border: "1px solid var(--border-strong)", borderRadius: 9, fontSize: 12.5, fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)" }} />
      <button className="btn btn-primary" disabled={saving || !link.trim()} onClick={saveLink}>{saving ? "Vérification…" : "Rattacher"}</button>
      {state.kind === "ready" && <button className="btn btn-ghost" onClick={() => { setEditing(false); setSaveErr(null); }}>Annuler</button>}
      {saveErr && <div style={{ width: "100%", fontSize: 12, color: "var(--red-fg, #A6412E)" }}>{saveErr}</div>}
    </div>
  );

  return (
    <div className="card" style={{ padding: "14px 18px", marginBottom: 14 }}>
      {state.kind === "loading" && header("Dossier SharePoint", <span style={{ fontSize: 12, color: "var(--text-3)" }}>Lecture…</span>)}

      {state.kind === "error" && (<>
        {header("Dossier SharePoint", <button className="btn btn-ghost" onClick={load}>Réessayer</button>)}
        <div style={{ fontSize: 12.5, color: "var(--red-fg, #A6412E)" }}>{state.message}</div>
        {canEdit && (editing ? linkForm : <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setEditing(true)}>Changer de dossier</button>)}
      </>)}

      {state.kind === "unconfigured" && (<>
        {header("Dossier SharePoint", state.folderUrl && <a className="btn btn-ghost" href={state.folderUrl} target="_blank" rel="noopener noreferrer">Ouvrir dans SharePoint</a>)}
        <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>
          La lecture en direct n&apos;est pas encore activée (connexion de l&apos;application à Microsoft en attente).
          {state.folderUrl ? " Le dossier reste accessible par le bouton ci-dessus." : ""}
        </div>
      </>)}

      {state.kind === "unlinked" && (<>
        {header("Dossier SharePoint")}
        <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Aucun dossier SharePoint rattaché à cette fiche.</div>
        {canEdit && linkForm}
      </>)}

      {state.kind === "ready" && (<>
        {header(
          <><FolderIcon open /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{state.root.name}</span><span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-3)" }}>· SharePoint, en direct</span></>,
          <>
            <button className="btn btn-ghost" onClick={load} title="Relire le dossier">Actualiser</button>
            <a className="btn btn-ghost" href={state.root.webUrl} target="_blank" rel="noopener noreferrer">Ouvrir dans SharePoint</a>
            {canEdit && !editing && <button className="btn btn-ghost" onClick={() => setEditing(true)}>Changer</button>}
          </>,
        )}
        {editing && linkForm}
        {state.items.length
          ? <div style={{ marginTop: 4 }}><Rows entity={entityType} id={entityId} items={state.items} depth={0} /></div>
          : <div style={{ fontSize: 12.5, color: "var(--text-3)", paddingTop: 6 }}>Dossier vide.</div>}
      </>)}
    </div>
  );
}
