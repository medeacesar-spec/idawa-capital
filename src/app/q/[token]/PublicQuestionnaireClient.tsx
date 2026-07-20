"use client";

import QuestionnaireForm from "@/components/impact/QuestionnaireForm";
import type { QData } from "@/lib/impact/questionnaire";
import { submitQuestionnaire } from "./actions";

export default function PublicQuestionnaireClient({ token, year, entityName, status, initial }: {
  token: string; year: number; entityName: string; status: string; initial: QData;
}) {
  const closed = status === "Validé";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #FAF6F0)", padding: "28px 16px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--espresso)", letterSpacing: ".5px" }}>IDAWA CAPITAL</div>
        </div>
        <div className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
          <h1 className="serif" style={{ fontSize: 19, fontWeight: 600, color: "var(--ink)", margin: "0 0 6px" }}>
            Questionnaire d&apos;impact {year} — {entityName}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
            Ce questionnaire porte sur l&apos;exercice fiscal <b>{year}</b> (du 1ᵉʳ janvier au 31 décembre {year}).
            Renseignez ce que vous pouvez ; les cases <b>Hommes / Femmes</b> se totalisent automatiquement.
            Les montants sont en <b>FCFA</b>. Vos réponses sont transmises à Idawa Capital.
          </p>
        </div>

        {closed ? (
          <div className="card" style={{ padding: "28px", textAlign: "center", fontSize: 13.5, color: "var(--text-2)" }}>
            Ce questionnaire a déjà été validé et clôturé. Merci !
          </div>
        ) : (
          <QuestionnaireForm
            initial={initial}
            onSubmit={async (d) => { await submitQuestionnaire(token, d); }}
            submitLabel="Envoyer mes réponses à Idawa Capital"
          />
        )}
      </div>
    </div>
  );
}
