"use client";

// Tags d'une fiche (dossier ou société) : affichage par famille, ajout avec autocomplétion
// (tag existant ou nouveau, avec sa famille), retrait d'un clic.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCanEdit } from "./WriteAccess";

type Tag = { id: string; name: string; family: string | null };
const FAMILIES = ["Filière", "Thématique", "Profil", "Zone", "PAEB", "IDERA", "Enabel"];
const label = (t: Tag) => (t.family ? `${t.family} · ${t.name}` : t.name);

export default function TagEditor({ entityType, entityId, tags, allTags, readOnly = false }: {
  entityType: "deal" | "company"; entityId: string; tags: Tag[]; allTags: Tag[]; readOnly?: boolean;
}) {
  const router = useRouter();
  const canEdit = useCanEdit() && !readOnly;
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [family, setFamily] = useState("Thématique");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attached = new Set(tags.map((t) => t.id));
  const suggestions = useMemo(() => allTags.filter((t) => !attached.has(t.id)), [allTags, attached]);
  const byLabel = new Map(suggestions.map((t) => [label(t).toLowerCase(), t]));
  const existing = byLabel.get(text.trim().toLowerCase())
    ?? suggestions.find((t) => t.name.toLowerCase() === text.trim().toLowerCase() && (t.family ?? "") === family);

  async function add() {
    const name = text.trim();
    if (!name) return;
    setBusy(true); setError(null);
    const supabase = createClient();
    let tagId = existing?.id;
    if (!tagId) {
      const { data, error: err } = await supabase.from("tags").insert({ name, family: family || null }).select("id").single();
      if (err) { setBusy(false); setError(err.message.includes("duplicate") ? "Ce tag existe déjà dans cette famille." : err.message); return; }
      tagId = data.id;
    }
    const { error: err } = await supabase.from("entity_tags").insert({ entity_type: entityType, entity_id: entityId, tag_id: tagId, source: "manuel" });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setText(""); setAdding(false);
    router.refresh();
  }

  async function remove(t: Tag) {
    setBusy(true);
    await createClient().from("entity_tags").delete().eq("entity_type", entityType).eq("entity_id", entityId).eq("tag_id", t.id);
    setBusy(false);
    router.refresh();
  }

  const chip: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 999, fontSize: 11, background: "var(--surface-cream)", color: "var(--text-2)", border: "1px solid var(--border)" };
  const listId = `tags-${entityId}`;

  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
      {tags.map((t) => (
        <span key={t.id} style={chip} title={t.family ?? undefined}>
          {t.family && <span style={{ color: "var(--text-3)" }}>{t.family} ·</span>}
          {t.name}
          {canEdit && <button onClick={() => remove(t)} disabled={busy} aria-label={`Retirer ${t.name}`}
            style={{ background: "none", border: "none", padding: 0, marginLeft: 2, cursor: "pointer", color: "var(--text-3)", fontSize: 12, lineHeight: 1 }}>×</button>}
        </span>
      ))}
      {canEdit && !adding && (
        <button onClick={() => { setAdding(true); setError(null); }}
          style={{ ...chip, cursor: "pointer", fontFamily: "inherit", background: "transparent", color: "var(--camel)", border: "1px dashed var(--border-strong)" }}>+ Tag</button>
      )}
      {canEdit && adding && (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input autoFocus list={listId} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tag existant ou nouveau"
            onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
            style={{ padding: "4px 9px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)", minWidth: 200 }} />
          <datalist id={listId}>{suggestions.map((t) => <option key={t.id} value={label(t)} />)}</datalist>
          {!existing && text.trim() && (
            <select value={family} onChange={(e) => setFamily(e.target.value)} aria-label="Famille du nouveau tag"
              style={{ padding: "4px 8px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12, fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)" }}>
              {FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
              <option value="">Sans famille</option>
            </select>
          )}
          <button className="btn btn-primary" style={{ fontSize: 11.5, padding: "4px 10px" }} disabled={busy || !text.trim()} onClick={add}>{existing ? "Ajouter" : "Créer et ajouter"}</button>
          <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "4px 10px" }} onClick={() => setAdding(false)}>Annuler</button>
        </span>
      )}
      {error && <span style={{ fontSize: 11.5, color: "var(--red-fg, #A6412E)" }}>{error}</span>}
    </div>
  );
}
