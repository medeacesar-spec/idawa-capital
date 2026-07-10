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

