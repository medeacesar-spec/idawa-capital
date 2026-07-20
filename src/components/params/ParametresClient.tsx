"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProgramRow } from "@/lib/data/params";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import { PROGRAM_NATURES, PROGRAM_STATUS, PROGRAM_COLORS } from "@/lib/ui-constants";
import { CADENCE_DATA_TYPES, CADENCES, type CadenceSettings } from "@/lib/cadence";

const NATURE_NOTE: Record<string, string> = {
  invest: "Métriques financières : investi, valeur, TVPI, TRI, cap table.",
  accompagnement: "Activité & impact : budget, bénéficiaires, jours d'AT, emplois.",
  mixte: "Les deux grilles : financière et activité/impact.",
};

type Draft = { id?: string; name: string; color: string; nature: string; status: string };
const EMPTY: Draft = { name: "", color: PROGRAM_COLORS[0], nature: "invest", status: "Actif" };

export default function ParametresClient({ programs, fundId, cadence }: { programs: ProgramRow[]; fundId: string | null; cadence: CadenceSettings }) {
  const router = useRouter();
  const [rows, setRows] = useState(programs);
  const [modal, setModal] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const [cad, setCad] = useState<CadenceSettings>(cadence);
  async function saveCadence(next: CadenceSettings) {
    setCad(next);
    if (!fundId) return;
    await createClient().from("funds").update({ reporting_cadence: next }).eq("id", fundId);
    router.refresh();
  }

  async function saveNature(id: string, nature: string) {
    setRows((r) => r.map((p) => (p.id === id ? { ...p, nature: nature as ProgramRow["nature"] } : p)));
    const supabase = createClient();
    await supabase.from("programs").update({ nature }).eq("id", id);
    router.refresh();
  }

  async function submit() {
    if (!modal || !modal.name.trim()) return;
    setBusy(true);
    const supabase = createClient();
    if (modal.id) {
      await supabase.from("programs").update({ name: modal.name, color: modal.color, nature: modal.nature, status: modal.status }).eq("id", modal.id);
    } else {
      const { data: fund } = await supabase.from("funds").select("id").limit(1).single();
      await supabase.from("programs").insert({ name: modal.name, color: modal.color, nature: modal.nature, status: modal.status, fund_id: fund?.id, position: rows.length });
    }
    setBusy(false);
    setModal(null);
    router.refresh();
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Supprimer le programme « ${name} » ? Les entreprises et deals rattachés ne seront pas supprimés mais perdront ce rattachement.`)) return;
    const supabase = createClient();
    await supabase.from("programs").delete().eq("id", id);
    setRows((r) => r.filter((p) => p.id !== id));
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12.5, color: "var(--text-2)", maxWidth: 560 }}>
          Créez et configurez vos <b>programmes</b>. La <b>nature</b> détermine les métriques suivies et l'affichage sur le tableau de bord, la performance et le reporting.
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ ...EMPTY })}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Nouveau programme
        </button>
      </div>

      <div className="card" style={{ padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Cadence de reporting</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55, marginBottom: 14, maxWidth: 620 }}>
          Le rythme de collecte des données d&apos;entreprise. <b>Mensuel par défaut</b> ; vous pouvez repasser un type de donnée en trimestriel, ou changer le défaut global. Les états financiers OHADA complets restent annuels par nature.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "10px 16px", alignItems: "center", maxWidth: 560 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>Cadence par défaut</label>
          <Select value={cad.default} onChange={(e) => saveCadence({ ...cad, default: e.target.value as CadenceSettings["default"] })} style={{ maxWidth: 240 }}>
            {CADENCES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          {CADENCE_DATA_TYPES.map((t) => (
            <Fragment key={t.key}>
              <label style={{ fontSize: 12.5, color: "var(--text-2)" }}>{t.label}</label>
              <Select value={cad[t.key] ?? ""} onChange={(e) => saveCadence({ ...cad, [t.key]: e.target.value ? (e.target.value as CadenceSettings["default"]) : null })} style={{ maxWidth: 240 }}>
                <option value="">Suivre le défaut ({CADENCES.find((c) => c.value === cad.default)?.label})</option>
                {CADENCES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Fragment>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: "4px 18px" }}>
        {rows.map((p, i) => (
          <div key={p.id} style={{ padding: "16px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
              {p.status === "Clos" && <span className="badge badge-neutral">Clos</span>}
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <Link href={`/parametres/${p.id}`} className="btn btn-ghost" style={{ padding: "5px 10px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="14" cy="18" r="2" /></svg>
                  Configurer
                </Link>
                <button className="btn btn-ghost" style={{ padding: "5px 10px", color: "var(--red-fg)" }} onClick={() => remove(p.id, p.name)}>Supprimer</button>
              </div>
            </div>
            <div style={{ display: "flex", border: "1px solid var(--border-strong)", borderRadius: 10, overflow: "hidden", width: "fit-content", maxWidth: "100%", flexWrap: "wrap" }}>
              {PROGRAM_NATURES.map((n) => {
                const on = p.nature === n.key;
                return (
                  <button key={n.key} onClick={() => saveNature(p.id, n.key)}
                    style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", border: "none",
                      background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)" }}>
                    {n.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 8 }}>{NATURE_NOTE[p.nature]}</div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal.id ? "Modifier le programme" : "Nouveau programme"}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" disabled={busy || !modal.name.trim()} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
          </>}
        >
          <Field label="Nom du programme"><Input value={modal.name} autoFocus onChange={(e) => setModal({ ...modal, name: e.target.value })} placeholder="Ex : Programme Agri-PME" /></Field>
          <Field label="Nature">
            <Select value={modal.nature} onChange={(e) => setModal({ ...modal, nature: e.target.value })}>
              {PROGRAM_NATURES.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
            </Select>
          </Field>
          <Field label="Statut">
            <Select value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
              {PROGRAM_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Couleur">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PROGRAM_COLORS.map((col) => (
                <button key={col} onClick={() => setModal({ ...modal, color: col })} aria-label={col}
                  style={{ width: 28, height: 28, borderRadius: 8, background: col, border: modal.color === col ? "2px solid var(--ink)" : "2px solid transparent", cursor: "pointer" }} />
              ))}
            </div>
          </Field>
        </Modal>
      )}
    </div>
  );
}
