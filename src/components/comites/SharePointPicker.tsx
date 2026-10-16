"use client";

// Choix des pièces à présenter, dans le dossier SharePoint de la fiche (lu en direct).
// Les fichiers cochés sont COPIÉS dans le dossier de séance : la version présentée est figée.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { FolderIcon, fetchFolder, type SpItem } from "@/components/documents/SharePointFolder";

function Node({ base, item, depth, picked, toggle }: { base: string; item: SpItem; depth: number; picked: Map<string, string>; toggle: (it: SpItem) => void }) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<SpItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pad = 4 + depth * 18;

  async function expand() {
    if (!open && children === null) {
      try { setChildren((await fetchFolder(base, item.id)).items); } catch (e) { setErr((e as Error).message); }
    }
    setOpen((o) => !o);
  }

  if (!item.isFolder) {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 8, padding: `7px 4px 7px ${pad + 18}px`, borderTop: "1px solid var(--sep)", cursor: "pointer" }}>
        <input type="checkbox" checked={picked.has(item.id)} onChange={() => toggle(item)} />
        <span style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
      </label>
    );
  }
  return (
    <>
      <button onClick={expand} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: `7px 4px 7px ${pad}px`, borderTop: "1px solid var(--sep)", borderLeft: "none", borderRight: "none", borderBottom: "none", background: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
        <span style={{ width: 10, fontSize: 9, color: "var(--text-3)", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
        <FolderIcon open={open} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{item.name}</span>
      </button>
      {err && <div style={{ padding: `4px 4px 6px ${pad + 28}px`, fontSize: 12, color: "var(--red-fg, #A6412E)" }}>{err}</div>}
      {open && children?.map((c) => <Node key={c.id} base={base} item={c} depth={depth + 1} picked={picked} toggle={toggle} />)}
    </>
  );
}

export default function SharePointPicker({ entityType, entityId, entityName, onConfirm, onClose }: {
  entityType: "deal" | "company"; entityId: string; entityName: string;
  onConfirm: (ids: string[]) => Promise<string | null>; onClose: () => void;
}) {
  const base = `/api/sharepoint/folder?${new URLSearchParams({ entity: entityType, id: entityId })}`;
  const [items, setItems] = useState<SpItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState(new Map<string, string>());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchFolder(base).then((j) => {
      if (!j.configured) setErr("La lecture en direct de SharePoint n'est pas activée.");
      else if (!j.linked) setErr("Aucun dossier SharePoint rattaché à cette fiche : rattachez-le depuis son onglet Documents.");
      else setItems(j.items);
    }).catch((e) => setErr((e as Error).message));
  }, [base]);

  const toggle = (it: SpItem) => setPicked((p) => { const n = new Map(p); if (n.has(it.id)) n.delete(it.id); else n.set(it.id, it.name); return n; });

  async function confirm() {
    setBusy(true); setErr(null);
    const e = await onConfirm(Array.from(picked.keys()));
    setBusy(false);
    if (e) setErr(e); else onClose();
  }

  return (
    <Modal title={`Pièces de ${entityName}`} onClose={onClose} maxWidth={620}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy || picked.size === 0} onClick={confirm}>
          {busy ? "Copie en cours…" : `Ajouter ${picked.size || ""} pièce${picked.size > 1 ? "s" : ""} au dossier de séance`}
        </button>
      </>}>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>
        Cochez les fichiers à présenter. Ils sont copiés tels quels : une modification ultérieure dans SharePoint ne change pas le dossier de séance.
      </div>
      {err && <div style={{ fontSize: 12.5, color: "var(--red-fg, #A6412E)", marginBottom: 8 }}>{err}</div>}
      {!items && !err && <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Lecture…</div>}
      {items && <div style={{ maxHeight: 420, overflowY: "auto" }}>{items.map((it) => <Node key={it.id} base={base} item={it} depth={0} picked={picked} toggle={toggle} />)}</div>}
    </Modal>
  );
}
