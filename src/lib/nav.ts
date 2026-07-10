// Configuration de la navigation principale (barre latérale)
export type NavItem = {
  key: string;
  label: string;
  href: string;
  director?: boolean; // visible seulement pour la Direction
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Pilotage",
    items: [
      { key: "dashboard", label: "Tableau de bord", href: "/dashboard" },
      { key: "pipeline", label: "Pipeline", href: "/pipeline" },
      { key: "portefeuille", label: "Portefeuille", href: "/portefeuille" },
      { key: "performance", label: "Performance", href: "/performance" },
      { key: "esg", label: "ESG & Impact", href: "/esg" },
      { key: "reporting", label: "Reporting & extraction", href: "/reporting" },
    ],
  },
  {
    title: "Relation",
    items: [
      { key: "contacts", label: "Contacts", href: "/contacts" },
      { key: "documents", label: "Documents", href: "/documents" },
      { key: "partenaires", label: "Partenaires & LPs", href: "/partenaires", director: true },
    ],
  },
  {
    title: "Administration",
    items: [
      { key: "utilisateurs", label: "Utilisateurs & rôles", href: "/utilisateurs", director: true },
      { key: "kpi", label: "Bibliothèque KPIs", href: "/kpi" },
      { key: "parametres", label: "Paramètres du fonds", href: "/parametres" },
    ],
  },
];

// Domaine de permission requis par page (les pages absentes sont toujours visibles :
// tableau de bord, contacts, documents). min par défaut = "L" (lecture).
export const NAV_REQ: Record<string, { domain: string; min?: string }> = {
  pipeline: { domain: "pipeline" },
  portefeuille: { domain: "portefeuille" },
  performance: { domain: "consolide" },
  esg: { domain: "consolide" },
  reporting: { domain: "reporting" },
  partenaires: { domain: "consolide" },
  utilisateurs: { domain: "users" },
  kpi: { domain: "config" },
  parametres: { domain: "config", min: "E" },
};

const RANK: Record<string, number> = { "-": 0, "L": 1, "V": 2, "E": 3 };

/** Renvoie l'ensemble des clés de navigation autorisées pour un jeu de permissions. */
export function allowedNavKeys(perms: Record<string, string> | null | undefined): string[] {
  const keys: string[] = [];
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const req = NAV_REQ[item.key];
      if (!req) { keys.push(item.key); continue; }
      const have = RANK[perms?.[req.domain] ?? "-"] ?? 0;
      if (have >= (RANK[req.min ?? "L"] ?? 1)) keys.push(item.key);
    }
  }
  return keys;
}

// Titre + sous-titre de l'en-tête par page
export const PAGE_META: Record<string, { title: string; sub: string }> = {
  dashboard: { title: "Tableau de bord", sub: "Vue d'ensemble du fonds" },
  pipeline: { title: "Pipeline", sub: "Dossiers d'investissement par étape" },
  portefeuille: { title: "Portefeuille", sub: "Participations actives" },
  performance: { title: "Performance", sub: "Multiples, TRI et création de valeur" },
  esg: { title: "ESG & Impact", sub: "Méthodologie I&P / IFC" },
  reporting: { title: "Reporting & extraction", sub: "Consolidation et exports" },
  contacts: { title: "Contacts", sub: "Répertoire par organisation" },
  documents: { title: "Documents", sub: "Pièces et rapports" },
  partenaires: { title: "Partenaires & LPs", sub: "Investisseurs et bailleurs" },
  utilisateurs: { title: "Utilisateurs & rôles", sub: "Gestion des accès de l'équipe" },
  kpi: { title: "Bibliothèque KPIs", sub: "Indicateurs par industrie et sous-secteur" },
  parametres: { title: "Paramètres du fonds", sub: "Programmes, nature et configuration" },
  saisie: { title: "Saisir un reporting", sub: "Saisie des KPIs par société et période" },
};
