// Alimentation automatique des KPIs financiers.
//
// Beaucoup de KPIs suivis (chiffre d'affaires, EBE, résultat net, BFR, marges…) sont déjà
// contenus dans les états financiers OHADA saisis par ailleurs. Les ressaisir à la main,
// c'est doubler le travail et risquer deux chiffres divergents pour la même réalité.
// On les dérive donc de la source comptable, à la demande et après vérification.

import { computeOhada, bilanFonctionnel, ratios } from "./ohada";

/** Lecture d'un poste de la grille Budget & BP pour un exercice donné. */
export type BudgetLookup = (label: string) => number | null;

export type KpiSource = {
  /** Reconnaissance du KPI suivi par son nom, quelle que soit sa rédaction. */
  match: RegExp;
  /** Ce qui est montré à l'utilisateur pour justifier le chiffre. */
  origin: string;
  unit: "FCFA" | "%" | "x";
  compute: (v: Record<string, number>) => number | null;
  /** Même indicateur, lu dans la grille Budget & BP quand les états financiers manquent. */
  fromBudget?: (line: BudgetLookup) => number | null;
};

const ratio = (num: number | null, den: number | null) =>
  num == null || den == null || den === 0 ? null : (num / den) * 100;

const pct = (r: number | null) => (r == null ? null : r * 100);

// L'ordre compte : la première correspondance gagne, donc les libellés les plus
// spécifiques doivent précéder les plus généraux (« taux d'EBE » avant « EBE »).
export const KPI_SOURCES: KpiSource[] = [
  { match: /taux\s*d.?\s*ebe|marge\s*d.?\s*ebe|marge\s*ebe/i, origin: "EBE / Chiffre d'affaires (XD ÷ XB)", unit: "%",
    compute: (v) => pct(ratios(v).margeEbe),
    fromBudget: (l) => ratio(l("Excédent brut d'exploitation (EBE)"), l("Chiffre d'affaires")) },
  { match: /marge\s*nette/i, origin: "Résultat net / Chiffre d'affaires (XI ÷ XB)", unit: "%",
    compute: (v) => pct(ratios(v).margeNette),
    fromBudget: (l) => ratio(l("Résultat net"), l("Chiffre d'affaires")) },
  { match: /marge\s*commerciale/i, origin: "Marge commerciale (XA)", unit: "FCFA",
    compute: (v) => v.XA ?? null },
  { match: /rentabilit.\s*des\s*capitaux|\broe\b/i, origin: "Résultat net / Capitaux propres (XI ÷ CP)", unit: "%",
    compute: (v) => pct(ratios(v).roe) },
  { match: /autonomie\s*financi/i, origin: "Capitaux propres / Total bilan (CP ÷ DZ)", unit: "%",
    compute: (v) => pct(ratios(v).autonomie) },
  { match: /liquidit.\s*g.n.rale/i, origin: "Actif circulant / Passif circulant (BK ÷ DP)", unit: "x",
    compute: (v) => ratios(v).liquiditeGenerale },
  { match: /endettement/i, origin: "Dettes financières / Capitaux propres", unit: "x",
    compute: (v) => ratios(v).endettement },

  { match: /chiffre\s*d.?\s*affaires|\bca\b/i, origin: "Chiffre d'affaires (XB)", unit: "FCFA",
    compute: (v) => v.XB ?? null, fromBudget: (l) => l("Chiffre d'affaires") },
  { match: /valeur\s*ajout/i, origin: "Valeur ajoutée (XC)", unit: "FCFA",
    compute: (v) => v.XC ?? null, fromBudget: (l) => l("Valeur ajoutée") },
  // EBITDA est l'appellation anglo-saxonne du même solde : la traiter à part créerait
  // deux chiffres pour une seule réalité.
  { match: /exc.dent\s*brut|\bebe\b|\bebitda\b/i, origin: "Excédent brut d'exploitation (XD)", unit: "FCFA",
    compute: (v) => v.XD ?? null, fromBudget: (l) => l("Excédent brut d'exploitation (EBE)") },
  { match: /r.sultat\s*d.?\s*exploitation/i, origin: "Résultat d'exploitation (XE)", unit: "FCFA",
    compute: (v) => v.XE ?? null, fromBudget: (l) => l("Résultat d'exploitation") },
  { match: /r.sultat\s*net|b.n.fice\s*net/i, origin: "Résultat net (XI)", unit: "FCFA",
    compute: (v) => v.XI ?? null, fromBudget: (l) => l("Résultat net") },

  { match: /besoin\s*en\s*fonds\s*de\s*roulement|\bbfr\b/i, origin: "Actif circulant − Passif circulant", unit: "FCFA",
    compute: (v) => bilanFonctionnel(v).bfr },
  { match: /fonds\s*de\s*roulement|\bfr\b/i, origin: "Ressources stables − Actif immobilisé", unit: "FCFA",
    compute: (v) => bilanFonctionnel(v).fondsRoulement },
  { match: /tr.sorerie/i, origin: "Trésorerie actif − Trésorerie passif", unit: "FCFA",
    compute: (v) => bilanFonctionnel(v).tresorerieNette },
  { match: /capitaux\s*propres/i, origin: "Capitaux propres (CP)", unit: "FCFA",
    compute: (v) => v.CP ?? null },
];

export function sourceFor(kpiName: string): KpiSource | null {
  return KPI_SOURCES.find((s) => s.match.test(kpiName)) ?? null;
}

export type ValueSource = "États financiers" | "Budget & BP — réalisé";
export type DerivedValue = { year: number; value: number; origin: string; unit: string; source: ValueSource };

/** Ligne de la grille Budget & BP, telle que stockée. */
export type BudgetRow = { period: string; label: string; budget: number | null; actual: number | null };

const round2 = (v: number) => Math.round(v * 100) / 100;

// Un état financier incomplet produit des zéros qui n'ont rien de comptable : le poste
// n'est simplement pas renseigné. Écrire ce 0 dans l'historique du KPI le rendrait faux
// et donnerait une courbe mensongère. Un exercice réellement nul se saisit à la main.
const usable = (v: number | null): v is number => v != null && Number.isFinite(v) && v !== 0;

function lookup(rows: BudgetRow[], year: number, field: "budget" | "actual"): BudgetLookup {
  return (label) => {
    const r = rows.find((x) => x.period === String(year) && x.label === label);
    const v = r ? r[field] : null;
    return v == null ? null : Number(v);
  };
}

/**
 * Valeurs dérivables pour un KPI, exercice par exercice.
 * Les états financiers font foi ; la grille Budget & BP ne comble que les exercices
 * qu'ils ne couvrent pas, pour ne jamais opposer deux chiffres sur un même exercice.
 */
export function derive(
  kpiName: string,
  statements: Record<number, Record<string, number>>,
  budget: BudgetRow[] = []
): DerivedValue[] {
  const src = sourceFor(kpiName);
  if (!src) return [];
  const byYear = new Map<number, DerivedValue>();

  for (const year of Object.keys(statements).map(Number)) {
    const value = src.compute(computeOhada(statements[year] ?? {}));
    if (!usable(value)) continue;
    byYear.set(year, { year, value: round2(value), origin: src.origin, unit: src.unit, source: "États financiers" });
  }

  if (src.fromBudget) {
    const years = Array.from(new Set(budget.map((r) => Number(r.period)))).filter(Number.isFinite);
    for (const year of years) {
      if (byYear.has(year)) continue; // les états financiers priment
      const value = src.fromBudget(lookup(budget, year, "actual"));
      if (!usable(value)) continue;
      byYear.set(year, { year, value: round2(value), origin: "Grille Budget & BP, colonne Réalisé", unit: src.unit, source: "Budget & BP — réalisé" });
    }
  }

  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}

/**
 * Cible du KPI lue dans la colonne Budget de l'exercice le plus récent qui en porte une.
 * Le budget EST l'objectif : le ressaisir comme « cible » serait une troisième saisie.
 */
export function budgetTarget(kpiName: string, budget: BudgetRow[]): { year: number; value: number } | null {
  const src = sourceFor(kpiName);
  if (!src?.fromBudget || budget.length === 0) return null;
  const years = Array.from(new Set(budget.map((r) => Number(r.period)))).filter(Number.isFinite).sort((a, b) => b - a);
  for (const year of years) {
    const value = src.fromBudget(lookup(budget, year, "budget"));
    if (usable(value)) return { year, value: round2(value) };
  }
  return null;
}

/**
 * Jeu d'indicateurs financiers NORMALISÉ sur le plan OHADA.
 *
 * Sans référence commune, chacun nomme le même solde à sa façon — « CA », « Chiffre
 * d'affaires HT », « Ventes » — et les fiches deviennent incomparables entre sociétés.
 * Ces libellés sont ceux du plan comptable, avec le code du poste dont ils sortent.
 *
 * Chaque nom est écrit pour correspondre à sa propre règle dans KPI_SOURCES : un KPI
 * ajouté depuis cette liste est donc alimenté automatiquement dès que les états financiers
 * sont saisis, sans aucune ressaisie. Le script scripts/check_ohada_kpis.mjs le vérifie.
 */
export const OHADA_KPIS: {
  name: string; code: string; unit: string; direction: "high" | "low"; group: string;
}[] = [
  // Soldes intermédiaires de gestion
  { name: "Chiffre d'affaires", code: "XB", unit: "FCFA", direction: "high", group: "Soldes de gestion" },
  { name: "Marge commerciale", code: "XA", unit: "FCFA", direction: "high", group: "Soldes de gestion" },
  { name: "Valeur ajoutée", code: "XC", unit: "FCFA", direction: "high", group: "Soldes de gestion" },
  { name: "Excédent brut d'exploitation", code: "XD", unit: "FCFA", direction: "high", group: "Soldes de gestion" },
  { name: "Résultat d'exploitation", code: "XE", unit: "FCFA", direction: "high", group: "Soldes de gestion" },
  { name: "Résultat net", code: "XI", unit: "FCFA", direction: "high", group: "Soldes de gestion" },

  // Rentabilité
  { name: "Taux d'EBE", code: "XD ÷ XB", unit: "%", direction: "high", group: "Rentabilité" },
  { name: "Marge nette", code: "XI ÷ XB", unit: "%", direction: "high", group: "Rentabilité" },
  { name: "Rentabilité des capitaux propres", code: "XI ÷ CP", unit: "%", direction: "high", group: "Rentabilité" },

  // Structure financière
  { name: "Capitaux propres", code: "CP", unit: "FCFA", direction: "high", group: "Structure financière" },
  { name: "Autonomie financière", code: "CP ÷ DZ", unit: "%", direction: "high", group: "Structure financière" },
  { name: "Endettement", code: "dettes ÷ CP", unit: "x", direction: "low", group: "Structure financière" },

  // Équilibre financier
  { name: "Fonds de roulement", code: "DF − AZ", unit: "FCFA", direction: "high", group: "Équilibre financier" },
  { name: "Besoin en fonds de roulement", code: "BK − DP", unit: "FCFA", direction: "low", group: "Équilibre financier" },
  { name: "Trésorerie nette", code: "BT − DT", unit: "FCFA", direction: "high", group: "Équilibre financier" },
  { name: "Liquidité générale", code: "BK ÷ DP", unit: "x", direction: "high", group: "Équilibre financier" },
];
