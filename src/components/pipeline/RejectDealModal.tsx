"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { Field, Select, Textarea } from "@/components/ui/form";
import { REJECTION_REASONS } from "@/lib/ui-constants";

export default function RejectDealModal({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [note, setNote] = useState("");

  async function submit() {
    setBusy(true);
    const full = note.trim() ? `${reason} — ${note.trim()}` : reason;
    await createClient().from("deals").update({ deal_state: "Écarté", rejection_reason: full }).eq("id", dealId);
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal title="Écarter le dossier" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "…" : "Écarter le dossier"}</button>
      </>}>
      <Field label="Motif">
        <Select value={reason} onChange={(e) => setReason(e.target.value)}>
          {REJECTION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      </Field>
      <Field label="Précision (optionnel)">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contexte, détail de la décision…" />
      </Field>
      <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
        Le dossier quittera le pipeline actif et rejoindra les dossiers clôturés. Cette action reste réversible (« Réactiver »).
      </div>
    </Modal>
  );
}
