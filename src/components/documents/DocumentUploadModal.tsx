"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import { DOC_CATEGORIES } from "@/lib/ui-constants";
import type { LinkOption } from "@/lib/data/documents";

export default function DocumentUploadModal({ entities, presetEntity, onClose }: { entities: LinkOption[]; presetEntity?: { id: string; type: "company" | "deal" }; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(DOC_CATEGORIES[0]);
  const [entityKey, setEntityKey] = useState(presetEntity ? `${presetEntity.type}:${presetEntity.id}` : "");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function submit() {
    if (!file || !title.trim()) return;
    setBusy(true); setError(null);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`;
    const up = await supabase.storage.from("documents").upload(path, file);
    if (up.error) { setError("Échec du téléversement : " + up.error.message); setBusy(false); return; }
    const [type, id] = entityKey ? entityKey.split(":") : [null, null];
    await supabase.from("documents").insert({
      title: title.trim(), category, storage_path: path,
      company_id: type === "company" ? id : null,
      deal_id: type === "deal" ? id : null,
    });
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal title="Déposer un document" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy || !file || !title.trim()} onClick={submit}>{busy ? "Téléversement…" : "Déposer"}</button>
      </>}>
      <Field label="Fichier">
        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px dashed var(--border-strong)", borderRadius: 10, cursor: "pointer", background: "var(--surface-cream)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--camel)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
          <span style={{ fontSize: 12.5, color: file ? "var(--ink)" : "var(--text-3)" }}>{file ? file.name : "Choisir un fichier…"}</span>
          <input type="file" onChange={onFile} style={{ display: "none" }} />
        </label>
      </Field>
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
