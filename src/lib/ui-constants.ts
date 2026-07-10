// Constantes utilisables côté client (aucune dépendance serveur).

export const DEAL_STAGES = ["Sourcing", "Analyse", "Due Diligence", "Négociation", "Closing", "Investi", "Perdu"];

export const PORTFOLIO_STATUS = ["Actif", "En difficulté", "Sorti"];

export const PROGRAM_NATURES: { key: string; label: string }[] = [
  { key: "invest", label: "Investissement" },
  { key: "mixte", label: "Mixte" },
  { key: "accompagnement", label: "Accompagnement" },
];

export const PROGRAM_STATUS = ["Actif", "Clos"];

export const PROGRAM_COLORS = ["#6B5744", "#7C7A3A", "#B5623F", "#8A4B5A", "#B07A2E", "#4A2617", "#3B6D11", "#185FA5"];

export const RELATION_TYPES = ["Investisseur fonds", "Bailleur programme", "Co-investisseur"];

export const PARTNER_STATUS = ["Engagé", "En discussion", "Due diligence"];

export const CONTACT_ORG_TYPES = ["Participation", "Pipeline", "Équipe Idawa", "Bailleur & partenaire", "Consultant & expert", "Comité"];

export const CONTACT_FUNCTIONS = [
  "PDG / DG", "Fondateur / Fondatrice", "Directeur financier", "Directeur commercial",
  "Directeur d'investissement", "Analyste", "Représentant bailleur", "Consultant / Expert",
  "Membre de comité", "Administrateur", "Autre",
];

export const DOC_CATEGORIES = ["Juridique", "Reporting", "Financier", "Comité", "ESG", "Autre"];

export const COMMITTEE_TYPES = ["Comité d'ouverture de dossier", "Comité d'investissement", "Comité de suivi", "Comité de sortie"];
export const COMMITTEE_DECISIONS = ["Favorable", "Favorable sous conditions", "Ajourné", "Défavorable"];

export const NOTE_TYPES = ["Réunion", "Appel", "Email", "Note"];
export const TASK_STATUS = ["À faire", "En cours", "Fait"];

// ESG — méthodologie I&P / IPDEV 2 + normes IFC (PS1–8)
// Catégorisation IFC : A (risque élevé), B (modéré), C (faible)
export const ESG_RISK_LEVELS = ["A", "B", "C"];
export const ESG_RISK_LABEL: Record<string, string> = { A: "A — Risque élevé", B: "B — Risque modéré", C: "C — Risque faible" };
export const ESG_ACTION_CATEGORIES = ["E", "S", "G"];
export const ESG_CATEGORY_LABEL: Record<string, string> = { E: "Environnement", S: "Social", G: "Gouvernance" };
export const ESG_ACTION_STATUS = ["À lancer", "En cours", "Réalisée"];
export const ESG_IMPACT_DIMENSIONS = ["Entrepreneurs", "Clients", "Employés", "Contractants", "Environnement", "Genre"];

// Données financières société
export const FINANCIAL_LABELS = ["Chiffre d'affaires", "EBITDA", "Résultat net", "Trésorerie", "Dette nette", "Effectif"];
export const FLOW_TYPES = ["Appel de fonds", "Distribution", "Valorisation"];
export const VALUATION_METHODS = ["Multiple (comparables)", "DCF", "Dernier tour", "Coût / prix d'entrée", "Actif net réévalué", "Autre"];
export const CAP_HOLDER_TYPES = ["Fondateur", "Idawa Capital", "Co-investisseur", "ESOP / salariés", "Autre"];

// Reporting — collecte
export const REPORTING_STATUS = ["À faire", "En cours", "Validé"];

// Dimensions KPI (valeurs stockées inchangées pour préserver la bibliothèque de 905 KPIs ;
// Financier et Client ajoutés). Libellés d'affichage enrichis.
export const KPI_DIMENSIONS = ["Financier", "Commercial", "Production", "Client", "Management", "Support"];
export const KPI_DIM_LABEL: Record<string, string> = {
  Financier: "Financier", Commercial: "Commercial", Production: "Production / Opérations",
  Client: "Client & Qualité", Management: "RH & Management", Support: "Support / SI",
};
export const KPI_DIM_COLOR: Record<string, string> = {
  Financier: "#185FA5", Commercial: "#A9714B", Production: "#B07A2E",
  Client: "#3B6D11", Management: "#4A2617", Support: "#8A5A3C",
};
export const KPI_DIRECTIONS = [{ value: "high", label: "Plus haut = mieux" }, { value: "low", label: "Plus bas = mieux" }];

// Due diligence
export const DD_DOMAINS = ["Financière", "Juridique & fiscale", "Commerciale", "Opérationnelle", "RH & social", "ESG", "Gouvernance"];
export const DD_STATUS = ["À faire", "En cours", "Terminé", "Point d'attention"];

// Création de valeur
export const VALUE_LEVERS = ["Croissance & commercial", "Excellence opérationnelle", "Structuration financière", "Gouvernance & management", "ESG & impact", "Build-up / M&A"];
export const VALUE_STATUS = ["Planifiée", "En cours", "Réalisée", "En pause"];

// Catalogue d'indicateurs d'accompagnement (chaîne de résultats), avec unité par défaut.
export const ACCOMPAGNEMENT_CATALOG: { category: string; items: { name: string; unit: string }[] }[] = [
  { category: "Moyens", items: [
    { name: "Budget alloué", unit: "FCFA" },
    { name: "Montant décaissé", unit: "FCFA" },
    { name: "Taux d'exécution budgétaire", unit: "%" },
    { name: "Cofinancement mobilisé", unit: "FCFA" },
    { name: "Coût moyen par bénéficiaire", unit: "FCFA" },
  ]},
  { category: "Bénéficiaires", items: [
    { name: "PME/entreprises accompagnées", unit: "nb" },
    { name: "Entrepreneurs formés", unit: "nb" },
    { name: "% femmes bénéficiaires", unit: "%" },
    { name: "% jeunes (<35 ans)", unit: "%" },
    { name: "% en milieu rural", unit: "%" },
    { name: "Nouveaux bénéficiaires", unit: "nb" },
  ]},
  { category: "Activités", items: [
    { name: "Jours d'assistance technique (AT)", unit: "jours" },
    { name: "Missions d'accompagnement", unit: "nb" },
    { name: "Sessions de formation", unit: "nb" },
    { name: "Ateliers / événements", unit: "nb" },
    { name: "Diagnostics d'entreprise réalisés", unit: "nb" },
    { name: "Consultants/experts mobilisés", unit: "nb" },
  ]},
  { category: "Réalisations", items: [
    { name: "Plans d'affaires élaborés", unit: "nb" },
    { name: "Entreprises formalisées", unit: "nb" },
    { name: "Certifications/labels obtenus", unit: "nb" },
    { name: "Outils de gestion mis en place", unit: "nb" },
    { name: "Mises en relation financement/marché", unit: "nb" },
  ]},
  { category: "Résultats", items: [
    { name: "Emplois créés", unit: "nb" },
    { name: "Emplois soutenus/maintenus", unit: "nb" },
    { name: "Croissance du CA des PME", unit: "%" },
    { name: "Financements levés par les PME", unit: "FCFA" },
    { name: "Taux de survie des entreprises", unit: "%" },
    { name: "Accès à de nouveaux marchés", unit: "nb" },
  ]},
];

export const ACCOMP_CATEGORY_COLOR: Record<string, string> = {
  Moyens: "#6B5744", Bénéficiaires: "#8A4B5A", Activités: "#B5623F", Réalisations: "#B07A2E", Résultats: "#7C7A3A",
};

