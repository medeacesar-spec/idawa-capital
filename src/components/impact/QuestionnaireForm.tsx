"use client";

// Rendu du questionnaire d'impact à partir de la spec. Sert des DEUX côtés :
//  · l'entrepreneur le remplit (editable, bouton Soumettre) ;
//  · Idawa le relit/analyse (readOnly, ou editable pour corriger avant validation).

import { useState } from "react";
import { IMPACT_SECTIONS, hfOf, hfTotal, totalEmplois, EMP_CATEGORIES, type QData, type QField } from "@/lib/impact/questionnaire";

const nf = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
function toNum(s: string): number | null { return s.trim() === "" ? null : Number(s.replace(",", ".")); }

const inp: React.CSSProperties = { width: "100%", padding: "7px 9px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", outline: "none", background: "var(--surface)", color: "var(--ink)" };
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--ink)", lineHeight: 1.4 };

export default function QuestionnaireForm({ initial, readOnly = false, onSubmit, submitLabel = "Soumettre le questionnaire", intro }: {
  initial: QData;
  readOnly?: boolean;
  onSubmit?: (d: QData) => Promise<void> | void;
  submitLabel?: string;
  intro?: React.ReactNode;
}) {
  const [data, setData] = useState<QData>(initial ?? {});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));
  const setHF = (k: string, side: "h" | "f", v: number | null) =>
    setData((d) => ({ ...d, [k]: { ...(d[k] as object ?? {}), [side]: v } }));
  const setComment = (sec: string, v: string) =>
    setData((d) => ({ ...d, comments: { ...(d.comments ?? {}), [sec]: v } }));

  async function submit() {
    if (!onSubmit) return;
    setBusy(true);
    await onSubmit(data);
    setBusy(false);
    setDone(true);
  }

  function renderField(f: QField) {
    if (f.kind === "hf") {
      const v = hfOf(data, f.key);
      const t = hfTotal(v);
      return (
        <div key={f.key} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 70px", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--sep)" }}>
          <div style={lbl}>{f.label}{f.help && <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 1 }}>{f.help}</div>}</div>
          <input type="number" style={inp} placeholder="H" value={v.h ?? ""} readOnly={readOnly} onChange={(e) => setHF(f.key, "h", toNum(e.target.value))} />
          <input type="number" style={inp} placeholder="F" value={v.f ?? ""} readOnly={readOnly} onChange={(e) => setHF(f.key, "f", toNum(e.target.value))} />
          <div className="tnum" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", textAlign: "right" }}>{t != null ? nf(t) : "—"}</div>
        </div>
      );
    }
    const val = data[f.key];
    const control = (() => {
      if (f.kind === "bool") return (
        <select style={inp} value={(val as string) ?? ""} disabled={readOnly} onChange={(e) => set(f.key, e.target.value || null)}><option value="">—</option><option value="Oui">Oui</option><option value="Non">Non</option></select>
      );
      if (f.kind === "bool3") return (
        <select style={inp} value={(val as string) ?? ""} disabled={readOnly} onChange={(e) => set(f.key, e.target.value || null)}><option value="">—</option><option value="Oui">Oui</option><option value="Non">Non</option><option value="En cours">En cours</option></select>
      );
      if (f.kind === "text") return (
        <textarea rows={2} style={{ ...inp, resize: "vertical" }} value={(val as string) ?? ""} readOnly={readOnly} onChange={(e) => set(f.key, e.target.value)} />
      );
      // num / pct / money
      const suffix = f.kind === "pct" ? "%" : f.kind === "money" ? "FCFA" : "";
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="number" style={inp} value={(val as number) ?? ""} readOnly={readOnly} onChange={(e) => set(f.key, toNum(e.target.value))} />
          {suffix && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{suffix}</span>}
        </div>
      );
    })();
    return (
      <div key={f.key} style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--sep)" }}>
        <div style={lbl}>{f.label}{f.help && <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 1 }}>{f.help}</div>}</div>
        {control}
      </div>
    );
  }

  if (done) {
    return (
      <div className="card" style={{ padding: "32px 28px", textAlign: "center" }}>
        <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Merci, c'est envoyé.</div>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>Vos réponses ont bien été transmises à Idawa Capital. Vous pouvez fermer cette page.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {intro}
      {IMPACT_SECTIONS.map((sec) => (
        <div key={sec.key} className="card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--espresso)", marginBottom: 10 }}>{sec.roman}. {sec.title}</div>
          {sec.groups.map((g) => (
            <div key={g.key} style={{ marginBottom: 14 }}>
              {g.title && <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", margin: "4px 0 6px" }}>{g.title}</div>}
              {g.fields.some((f) => f.kind === "hf") && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 70px", gap: 8, fontSize: 10.5, color: "var(--text-3)", padding: "2px 0" }}>
                  <span></span><span style={{ textAlign: "center" }}>Hommes</span><span style={{ textAlign: "center" }}>Femmes</span><span style={{ textAlign: "right" }}>Total</span>
                </div>
              )}
              {g.fields.map(renderField)}
            </div>
          ))}
          {sec.key === "employes" && (
            <div style={{ marginTop: 4, padding: "8px 12px", background: "var(--surface-cream)", borderRadius: 8, display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "var(--text-2)" }}>Total emplois (permanents + temporaires)</span>
              <span className="serif tnum" style={{ fontWeight: 700, color: "var(--ink)" }}>{nf(totalEmplois(data))}</span>
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>Commentaires</div>
            <textarea rows={2} style={{ ...inp, resize: "vertical" }} value={data.comments?.[sec.key] ?? ""} readOnly={readOnly} onChange={(e) => setComment(sec.key, e.target.value)} />
          </div>
        </div>
      ))}
      {onSubmit && !readOnly && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Envoi…" : submitLabel}</button>
        </div>
      )}
    </div>
  );
}

// Aide : voir si une réponse est « vide » (aucun champ rempli), pour l'affichage côté analyse.
export function isEmptyData(data: QData): boolean {
  const keys = Object.keys(data).filter((k) => k !== "comments");
  return keys.every((k) => {
    const v = data[k];
    if (v && typeof v === "object") return (v as { h?: unknown; f?: unknown }).h == null && (v as { f?: unknown }).f == null;
    return v == null || v === "";
  }) && (!data.comments || Object.values(data.comments).every((c) => !c?.trim()));
}
