"use client";

// Rattachement d'une société OU d'un dossier à ses programmes.
//
// Une même PME peut être suivie au titre de plusieurs programmes en même temps —
// Agri-PME et Femmes Entrepreneures, par exemple. L'obliger à choisir fausserait le
// pilotage des deux. Un programme reste PRINCIPAL : c'est lui qui compte dans les
// répartitions et les totaux du fonds, sinon la société serait comptée deux fois.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { useCanEdit } from "@/components/shared/WriteAccess";

export type ProgramTag = { id: string; name: string; color: string | null; principal: boolean };
export type ProgramOption = { id: string; name: string; color: string | null };

export default function ProgramMemberships({ entityType = "company", entityId, programs, options }: {
  /** Sociétés et dossiers partagent le même modèle d'adhésion : un seul composant. */
  entityType?: "company" | "deal";
  entityId: string;
  programs: ProgramTag[];
  options: ProgramOption[];
}) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attached = new Set(programs.map((p) => p.id));
  const available = options.filter((o) => !attached.has(o.id));

  async function attach(programId: string) {
    setBusy(true); setError(null);
    const { error: err } = await createClient().from("program_memberships").insert({
      entity_type: entityType, entity_id: entityId, program_id: programId,
      date_start: new Date().toISOString().slice(0, 10),
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  async function detach(p: ProgramTag) {
    if (p.principal) { setError("Le programme principal ne se retire pas ici : changez-le en modifiant la fiche."); return; }
    if (!confirm(`Retirer ${p.name} ? Le rattachement est clos à aujourd'hui, l'historique est conservé.`)) return;
    setBusy(true); setError(null);
    // On CLÔT l'adhésion au lieu de la supprimer : savoir qu'une société a relevé d'un
    // programme, et jusqu'à quand, fait partie de son histoire.
    const { error: err } = await createClient().from("program_memberships")
      .update({ date_end: new Date().toISOString().slice(0, 10) })
      .eq("entity_type", entityType).eq("entity_id", entityId).eq("program_id", p.id).is("date_end", null);
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  return (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {programs.map((p) => (
          <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border-strong)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color ?? "var(--text-3)" }} />
            {p.name}
            {p.principal && <span style={{ fontSize: 9.5, color: "var(--camel)", fontWeight: 700 }} title="Programme de référence pour les totaux du fonds">principal</span>}
          </span>
        ))}
        {canEdit && (
          <button onClick={() => { setError(null); setOpen(true); }}
            style={{ padding: "3px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: "transparent", color: "var(--camel)", border: "1px dashed var(--border-strong)" }}>
            + Programme
          </button>
        )}
      </div>

      {open && (
        <Modal title={entityType === "deal" ? "Programmes du dossier" : "Programmes de la société"} onClose={() => setOpen(false)}
          footer={<button className="btn btn-primary" onClick={() => setOpen(false)}>Terminé</button>}>
          <div style={{ padding: "16px 20px", display: "grid", gap: 14 }}>
            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
              Une fiche peut relever de plusieurs programmes en même temps. Le programme <b>principal</b> reste
              celui qui compte dans les répartitions et les totaux du fonds — sans lui, elle serait comptée deux fois.
              Il se change en modifiant la fiche.
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--camel)", marginBottom: 6 }}>Rattachements en cours</div>
              <div style={{ display: "grid", gap: 6 }}>
                {programs.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 9 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color ?? "var(--text-3)" }} />
                    <span style={{ fontSize: 12.5, color: "var(--ink)", flex: 1 }}>{p.name}</span>
                    {p.principal
                      ? <span className="badge badge-neutral">principal</span>
                      : <button className="btn btn-ghost" style={{ fontSize: 11, padding: "3px 9px" }} disabled={busy} onClick={() => detach(p)}>Retirer</button>}
                  </div>
                ))}
              </div>
            </div>

            {available.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--camel)", marginBottom: 6 }}>Ajouter</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {available.map((o) => (
                    <button key={o.id} disabled={busy} onClick={() => attach(o.id)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: "var(--surface)", color: "var(--text-2)", border: "1px dashed var(--border-strong)" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: o.color ?? "var(--text-3)" }} />
                      + {o.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: 10.5, color: "var(--text-3)", lineHeight: 1.6 }}>
              Retirer un programme <b>clôt</b> le rattachement à aujourd&apos;hui : la fiche n&apos;y apparaît plus,
              mais l&apos;historique est conservé — savoir qu&apos;elle en a relevé, et jusqu&apos;à quand, fait partie de son histoire.
            </div>
            {error && <div style={{ fontSize: 11.5, color: "var(--red-fg)" }}>{error}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}
