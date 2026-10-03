"use client";

// Page Documents : l'espace partagé SharePoint, lu en direct et rangé comme sur le site.
// Rien n'est copié dans l'application.

import { useCallback, useEffect, useState } from "react";
import { FolderIcon, Rows, fetchFolder, type SpItem } from "./SharePointFolder";

const BASE = "/api/sharepoint/site";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "unconfigured" }
  | { kind: "ready"; root: { name: string; webUrl: string }; items: SpItem[] };

export default function SharePointSite() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const j = await fetchFolder(BASE);
      setState(j.configured ? { kind: "ready", root: j.root, items: j.items } : { kind: "unconfigured" });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial depuis SharePoint
  useEffect(() => { load(); }, [load]);

  return (
    <div className="card" style={{ padding: "14px 18px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
          <FolderIcon open /> Espace partagé Idawa Capital
          <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-3)" }}>· SharePoint, en direct</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {state.kind !== "loading" && <button className="btn btn-ghost" onClick={load}>Actualiser</button>}
          {state.kind === "ready" && <a className="btn btn-ghost" href={state.root.webUrl} target="_blank" rel="noopener noreferrer">Ouvrir dans SharePoint</a>}
        </div>
      </div>
      {state.kind === "loading" && <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Lecture…</div>}
      {state.kind === "error" && <div style={{ fontSize: 12.5, color: "var(--red-fg, #A6412E)" }}>{state.message}</div>}
      {state.kind === "unconfigured" && <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>La lecture en direct de SharePoint n&apos;est pas activée.</div>}
      {state.kind === "ready" && (state.items.length
        ? <div style={{ marginTop: 4 }}><Rows base={BASE} items={state.items} depth={0} /></div>
        : <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Espace vide.</div>)}
    </div>
  );
}
