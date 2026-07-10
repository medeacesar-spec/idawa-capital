// Étapes du pipeline de deals (dans l'ordre)
export const DEAL_STAGES = [
  "Sourcing",
  "Analyse",
  "Due Diligence",
  "Négociation",
  "Closing",
  "Investi",
  "Perdu",
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

// Étapes considérées comme "actives" dans le pipeline (ni gagnées ni perdues)
export const ACTIVE_STAGES: DealStage[] = [
  "Sourcing",
  "Analyse",
  "Due Diligence",
  "Négociation",
  "Closing",
];

export const STAGE_COLORS: Record<DealStage, string> = {
  Sourcing: "#64748b",
  Analyse: "#0369a1",
  "Due Diligence": "#7c3aed",
  Négociation: "#b45309",
  Closing: "#c9a24b",
  Investi: "#15803d",
  Perdu: "#b91c1c",
};

// Catégories de performance des entreprises du portefeuille
export const KPI_CATEGORIES = [
  "Management",
  "Commercial",
  "Production",
  "Support",
] as const;
export type KpiCategory = (typeof KPI_CATEGORIES)[number];

export const KPI_CATEGORY_LABELS: Record<KpiCategory, string> = {
  Management: "Management global",
  Commercial: "Commercial",
  Production: "Production",
  Support: "Support interne",
};

export const KPI_CATEGORY_COLORS: Record<KpiCategory, string> = {
  Management: "#0f3d3e",
  Commercial: "#0369a1",
  Production: "#b45309",
  Support: "#7c3aed",
};

// Suggestions d'indicateurs par catégorie (aide à la saisie)
export const KPI_SUGGESTIONS: Record<KpiCategory, string[]> = {
  Management: [
    "Chiffre d'affaires",
    "EBITDA",
    "Marge nette (%)",
    "Trésorerie",
    "Burn rate mensuel",
    "Runway (mois)",
  ],
  Commercial: [
    "Nouveaux clients",
    "Taux de conversion (%)",
    "Revenu récurrent (MRR)",
    "Taux d'attrition (%)",
    "Panier moyen",
    "Pipeline commercial",
  ],
  Production: [
    "Volume produit",
    "Taux de qualité (%)",
    "Délai de livraison (jours)",
    "Capacité utilisée (%)",
    "Coût unitaire",
  ],
  Support: [
    "Effectif total",
    "Turnover (%)",
    "Tickets support",
    "Satisfaction employés (/10)",
    "Délai de résolution (h)",
  ],
};

// Rôles utilisateurs
export const ROLES = ["admin", "analyst", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  analyst: "Analyste",
  viewer: "Lecture seule",
};

// L'analyste et l'admin peuvent modifier les données
export function canEdit(role: Role | null | undefined): boolean {
  return role === "admin" || role === "analyst";
}
export function isAdmin(role: Role | null | undefined): boolean {
  return role === "admin";
}

// Secteurs d'activité (Afrique de l'Ouest / PE-VC)
export const SECTORS = [
  "Fintech",
  "Agroalimentaire",
  "Santé",
  "Éducation",
  "Énergie",
  "Logistique & Transport",
  "Distribution & Commerce",
  "Industrie & Manufacture",
  "Technologie & Digital",
  "Télécoms",
  "Immobilier",
  "Services",
  "Autre",
] as const;

// Statuts des entreprises en portefeuille
export const PORTFOLIO_STATUS = ["Actif", "En difficulté", "Sorti"] as const;
export type PortfolioStatus = (typeof PORTFOLIO_STATUS)[number];

export const PORTFOLIO_STATUS_COLORS: Record<string, string> = {
  Actif: "#15803d",
  "En difficulté": "#b45309",
  Sorti: "#64748b",
};

// Devises supportées
export const CURRENCIES = ["XOF", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];
