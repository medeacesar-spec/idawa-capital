"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Select, Textarea } from "@/components/ui/form";
import { STANDBY_REASONS } from "@/lib/ui-constants";

export default function StandbyDealModal({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(STANDBY_REASONS[0]);
  const [note, setNote] = useState("");

  async function submit() {
    setBusy(true);
    const full = note.trim() ? `${reason} — ${note.trim()}` : reason;
    const supabase = createClient();
    await supabase.from("deals").update({ deal_state: "En veille", standby_reason: full }).eq("id", dealId);
    // Trace datée dans le Suivi, en plus du badge : l'historique du dossier doit rester lisible.
    await supabase.from("notes").insert({
      entity_type: "deal", entity_id: dealId, type: "Note",
      note_date: new Date().toISOString().slice(0, 10),
      summary: `Dossier mis en veille — ${full}`,
    });
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal title="Mettre le dossier en veille" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "…" : "Mettre en veille"}</button>
      </>}>
      <Field label="Motif">
        <Select value={reason} onChange={(e) => setReason(e.target.value)}>
          {STANDBY_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      </Field>
      <Field label="Précision (optionnel)">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce qu'on attend, l'échéance, ce qui rouvrirait le dossier…" />
      </Field>
      <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
        Le dossier reste dans le pipeline mais sort des dossiers actifs. C&apos;est une pause, pas une fin&nbsp;: « Réactiver » le remet en cours à tout moment.
      </div>
    </Modal>
  );
}
