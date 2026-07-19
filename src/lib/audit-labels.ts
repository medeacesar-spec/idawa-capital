// Libellés du journal d'audit.
//
// Volontairement SÉPARÉS de la couche de données : ce fichier est importé par un composant
// client, et tout import indirect du client Supabase serveur casserait la compilation.

export const TABLE_LABEL: Record<string, string> = {
  deals: "Dossier", portfolio_companies: "Participation", committee_passages: "Comité", esg_actions: "Action E&S",
  esg_assessments: "Diagnostic ESG", company_flows: "Flux / valorisation", company_financials: "Budget", company_captable: "Cap table",
  contacts: "Contact", partners: "Partenaire", tracked_kpis: "KPI", dd_items: "Due diligence", value_creation: "Création de valeur",
  documents: "Document", company_reporting: "Reporting", programs: "Programme",
};

export const ACTION_LABEL: Record<string, string> = { INSERT: "Création", UPDATE: "Modification", DELETE: "Suppression" };

export const FIELD_LABEL: Record<string, string> = {
  name: "Nom", company_name: "Nom", status: "Statut", stage: "Étape", deal_state: "État du dossier",
  amount: "Montant", invested_amount: "Capital investi", current_valuation: "Valorisation",
  ownership_pct: "Participation (%)", tvpi: "Multiple", tri: "TRI", probability: "Probabilité",
  program_id: "Programme", tracking_type: "Type de suivi", primary_sub_sector_id: "Sous-secteur",
  investment_officer_id: "Chargé d'investissement", analyst_id: "Analyste",
  decision: "Décision", outcome: "Nature de la décision", conditions: "Conditions", participants: "Participants",
  session_date: "Date de séance", validated_by: "Validé par", validated_at: "Date de validation",
  due_date: "Échéance", target_date: "Échéance", date_end_plan: "Échéance", assignee_id: "Assigné à",
  assignee_label: "Assigné à", title: "Intitulé", item: "Intitulé", initiative: "Initiative", action: "Action",
  note: "Note", notes: "Notes", thesis: "Thèse", rejection_reason: "Motif", standby_reason: "Motif de mise en veille", post_mortem: "Post-mortem",
  budget: "Budget", actual: "Réalisé", value: "Valeur", target: "Cible", period: "Période",
  fiscal_year: "Exercice", method: "Méthode", amount_committed: "Engagé", amount_disbursed: "Décaissé",
  interest_rate: "Taux", duration_months: "Durée (mois)", grace_months: "Différé (mois)",
  amount_invoiced: "Facturé", amount_paid: "Encaissé", paid_date: "Date de paiement",
  ehs_sector: "Secteur EHS", ehs_families: "Familles EHS", nature: "Nature", permissions: "Permissions",
  role_id: "Rôle", email: "Email", full_name: "Nom complet", scope: "Portée",
};
