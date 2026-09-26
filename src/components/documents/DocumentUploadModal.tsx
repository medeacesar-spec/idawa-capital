"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import { DOC_CATEGORIES } from "@/lib/ui-constants";
import { isPersonalOneDrive, isValidLink, titleFromUrl } from "@/lib/doc-links";
import type { LinkOption } from "@/lib/data/documents";

type Mode = "file" | "link";

export default function DocumentUploadModal({ entities, presetEntity, onClose }: { entities: LinkOption[]; presetEntity?: { id: string; type: "company" | "deal" }; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(DOC_CATEGORIES[0]);
  const [entityKey, setEntityKey] = useState(presetEntity ? `${presetEntity.type}:${presetEntity.id}` : "");

  const linkOk = isValidLink(link);
  const ready = !!title.trim() && (mode === "file" ? !!file : linkOk);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }
  function onLink(v: string) {
    setLink(v);
    if (!title) { const t = titleFromUrl(v); if (t) setTitle(t); }
  }

  async function submit() {
    if (!ready) return;
    setBusy(true); setError(null);
    const supabase = createClient();
    let storagePath: string | null = null;
    if (mode === "file" && file) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      storagePath = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`;
      const up = await supabase.storage.from("documents").upload(storagePath, file);
      if (up.error) { setError("Échec du téléversement : " + up.error.message); setBusy(false); return; }
    }
    const [type, id] = entityKey ? entityKey.split(":") : [null, null];
    const ins = await supabase.from("documents").insert({
      title: title.trim(), category,
      storage_path: storagePath,
      url: mode === "link" ? link.trim() : null,
      company_id: type === "company" ? id : null,
      deal_id: type === "deal" ? id : null,
    });
    if (ins.error) { setError("Enregistrement impossible : " + ins.error.message); setBusy(false); return; }
    setBusy(false);
    onClose();
    router.refresh();
  }

  const tab = (m: Mode, label: string) => (
    <button type="button" onClick={() => { setMode(m); setError(null); }}
      style={{ flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        background: mode === m ? "var(--espresso)" : "var(--surface)", color: mode === m ? "#fff" : "var(--text-2)",
        border: `1px solid ${mode === m ? "var(--espresso)" : "var(--border-strong)"}` }}>
      {label}
    </button>
  );

  return (
    <Modal title="Ajouter un document" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy || !ready} onClick={submit}>{busy ? "Enregistrement…" : "Ajouter"}</button>
      </>}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {tab("file", "Téléverser un fichier")}
        {tab("link", "Lien OneDrive / SharePoint")}
      </div>

      {mode === "file" ? (
        <Field label="Fichier">
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px dashed var(--border-strong)", borderRadius: 10, cursor: "pointer", background: "var(--surface-cream)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--camel)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
            <span style={{ fontSize: 12.5, color: file ? "var(--ink)" : "var(--text-3)" }}>{file ? file.name : "Choisir un fichier…"}</span>
            <input type="file" onChange={onFile} style={{ display: "none" }} />
          </label>
        </Field>
      ) : (
        <Field label="Lien" hint="Dans OneDrive ou SharePoint : clic droit sur le fichier ou le dossier → « Copier le lien ».">
          <Input type="url" value={link} onChange={(e) => onLink(e.target.value)} placeholder="https://idawacapitalbenin.sharepoint.com/…" />
          {link && !linkOk && <div style={{ fontSize: 11.5, color: "var(--red-fg)", marginTop: 5 }}>Le lien doit commencer par https://</div>}
          {linkOk && isPersonalOneDrive(link) && (
            <div style={{ fontSize: 11.5, color: "var(--amber-fg)", background: "var(--amber-bg)", borderRadius: 8, padding: "8px 10px", marginTop: 6 }}>
              Ce lien pointe vers un OneDrive <b>personnel</b> : les autres membres de l&rsquo;équipe ne pourront l&rsquo;ouvrir que si le fichier leur a été partagé. Préférez l&rsquo;espace partagé.
            </div>
          )}
        </Field>
      )}

      <Field label="Titre"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Pacte d'actionnaires" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Catégorie">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>{DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
        </Field>
        <Field label="Rattacher à">
          <Select value={entityKey} onChange={(e) => setEntityKey(e.target.value)} disabled={!!presetEntity}>
            <option value="">— Général —</option>
            {entities.map((e) => <option key={`${e.type}:${e.id}`} value={`${e.type}:${e.id}`}>{e.type === "company" ? "Société" : "Dossier"} · {e.name}</option>)}
          </Select>
        </Field>
      </div>
      {error && <div style={{ fontSize: 12.5, color: "var(--red-fg)", background: "var(--red-bg)", borderRadius: 8, padding: "9px 12px" }}>{error}</div>}
    </Modal>
  );
}
