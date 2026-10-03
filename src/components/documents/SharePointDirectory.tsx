"use client";

// Page Documents : les dossiers SharePoint des fiches, rangés comme l'application
// (fonds, pipeline non qualifié, programmes, portefeuille). Un groupe à la fois, une recherche
// par nom ; chaque dossier se déplie et se lit EN DIRECT, avec le garde-fou de sa fiche.

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SpEntry, SpGroup } from "@/lib/data/sharepointDirectory";
import { FolderIcon, Rows, fetchFolder, type SpItem } from "./SharePointFolder";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ExternalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
);

function Pill({ children, color }: { children: React.ReactNode; color?: string | null }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap",
      background: color ? `${color}1f` : "var(--surface-cream)", color: color ?? "var(--text-2)" }}>{children}</span>
  );
}

function Entry({ entry, groupLabel }: { entry: SpEntry; groupLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SpItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `/api/sharepoint/folder?${new URLSearchParams({ entity: entry.entityType, id: entry.id })}`;

  async function toggle() {
    if (!open && items === null) {
      setBusy(true); setErr(null);
      try {
        const j = await fetchFolder(base);
        if (!j.configured) throw new Error("La lecture en direct de SharePoint n'est pas activée.");
        setItems(j.linked ? j.items : []);
      } catch (e) { setErr((e as Error).message); }
      setBusy(false);
    }
    setOpen((o) => !o);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderTop: "1px solid var(--sep)", opacity: entry.closed ? 0.7 : 1 }}>
        <button onClick={toggle} aria-expanded={open}
          style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
          <span style={{ width: 10, fontSize: 9, color: "var(--text-3)", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
          <FolderIcon open={open} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</span>
          {busy && <span style={{ fontSize: 11, color: "var(--text-3)" }}>…</span>}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {groupLabel && <Pill>{groupLabel}</Pill>}
          {entry.alsoIn.map((g) => <Pill key={g}>aussi : {g}</Pill>)}
          {entry.country && entry.country !== "Bénin" && <Pill>{entry.country}</Pill>}
          {entry.closed && <Pill color="#A6412E">{entry.closed}</Pill>}
          <Link href={entry.href} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11.5 }}>Fiche</Link>
          {entry.folderUrl && (
            <a href={entry.folderUrl} target="_blank" rel="noopener noreferrer" title="Ouvrir dans SharePoint" aria-label="Ouvrir dans SharePoint"
              style={{ display: "flex", padding: 5, color: "var(--text-3)" }}><ExternalIcon /></a>
          )}
        </div>
      </div>
      {open && err && <div style={{ padding: "6px 4px 8px 40px", fontSize: 12, color: "var(--red-fg, #A6412E)" }}>{err}</div>}
      {open && items && (items.length
        ? <div style={{ background: "var(--surface-cream)", borderRadius: 8, margin: "0 0 6px 18px" }}><Rows base={base} items={items} depth={0} /></div>
        : <div style={{ padding: "6px 4px 8px 40px", fontSize: 12, color: "var(--text-3)" }}>Dossier vide.</div>)}
    </>
  );
}

export default function SharePointDirectory({ groups }: { groups: SpGroup[] }) {
  const [active, setActive] = useState(() => groups.find((g) => g.entries.length)?.key ?? groups[0]?.key ?? "");
  const [query, setQuery] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const q = norm(query.trim());

  // Recherche : toutes les fiches, une seule fois chacune, avec leur groupe.
  const matches = useMemo(() => {
    if (!q) return [];
    const seen = new Set<string>();
    const out: { entry: SpEntry; group: SpGroup }[] = [];
    for (const g of groups) for (const e of g.entries) {
      const k = `${e.entityType}:${e.id}`;
      if (!seen.has(k) && norm(e.name).includes(q)) { seen.add(k); out.push({ entry: e, group: g }); }
    }
    return out.sort((a, b) => a.entry.name.localeCompare(b.entry.name, "fr", { sensitivity: "base" }));
  }, [groups, q]);

  const group = groups.find((g) => g.key === active);
  const live = group?.entries.filter((e) => !e.closed) ?? [];
  const closed = group?.entries.filter((e) => e.closed) ?? [];
  const total = new Set(groups.flatMap((g) => g.entries.map((e) => `${e.entityType}:${e.id}`))).size;

  return (
    <div className="card" style={{ padding: "16px 18px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
            <FolderIcon open /> Dossiers des entreprises
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
            {total} dossier{total > 1 ? "s" : ""} SharePoint rattaché{total > 1 ? "s" : ""} aux fiches · lus en direct
          </div>
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une entreprise…" aria-label="Rechercher une entreprise"
          style={{ flex: "0 1 260px", minWidth: 0, padding: "8px 12px", border: "1px solid var(--border-strong)", borderRadius: 9, fontSize: 12.5, fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)" }} />
      </div>

      {q ? (
        matches.length
          ? <div>{matches.map(({ entry, group: g }) => <Entry key={`${entry.entityType}:${entry.id}`} entry={entry} groupLabel={g.label} />)}</div>
          : <div style={{ fontSize: 12.5, color: "var(--text-3)", padding: "10px 4px" }}>Aucune entreprise ne correspond.</div>
      ) : (<>
        <div role="tablist" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {groups.map((g) => {
            const on = g.key === active;
            const n = g.entries.filter((e) => !e.closed).length;
            return (
              <button key={g.key} role="tab" aria-selected={on} onClick={() => { setActive(g.key); setShowClosed(false); }}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)", border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}` }}>
                {g.color && <span style={{ width: 7, height: 7, borderRadius: 999, background: g.color }} />}
                {g.label}
                <span className="tnum" style={{ fontSize: 11, fontWeight: 500, opacity: 0.75 }}>{n}</span>
              </button>
            );
          })}
        </div>
        {group && <div style={{ fontSize: 11.5, color: "var(--text-3)", margin: "8px 4px 4px" }}>{group.hint}</div>}
        {group && (live.length
          ? <div>{live.map((e) => <Entry key={`${e.entityType}:${e.id}`} entry={e} />)}</div>
          : <div style={{ fontSize: 12.5, color: "var(--text-3)", padding: "10px 4px", borderTop: "1px solid var(--sep)" }}>
              Aucun dossier rattaché pour l&apos;instant. Rattachez-le depuis l&apos;onglet Documents de la fiche : il apparaîtra ici.
            </div>)}
        {closed.length > 0 && (<>
          <button onClick={() => setShowClosed((s) => !s)}
            style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, padding: "10px 4px 4px", background: "none", border: "none", borderTop: "1px solid var(--sep)", width: "100%", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: "var(--text-3)", textAlign: "left" }}>
            <span style={{ fontSize: 9, transform: showClosed ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
            Dossiers clos ({closed.length})
          </button>
          {showClosed && closed.map((e) => <Entry key={`${e.entityType}:${e.id}`} entry={e} />)}
        </>)}
      </>)}
    </div>
  );
}
