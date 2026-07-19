// Analyse financière — reprise du modèle « Analyse Financière » utilisé par Saint-André.
//
// L'application ne produisait que sept ratios, sans norme ni lecture, et son bilan
// fonctionnel se limitait à trois lignes. Le modèle déposé va bien plus loin : un bilan
// fonctionnel complet avec la variation d'un exercice à l'autre, les soldes du compte de
// résultat rapportés au chiffre d'affaires, la capacité d'autofinancement, et une
// bibliothèque de ratios rangés par famille — chacun avec sa formule, sa NORME et son
// INTERPRÉTATION.
//
// Un ratio sans norme ne se lit pas : « 0,8 » ne dit rien tant qu'on ignore qu'on
// l'attend au-dessus de 1. C'est ce qui manquait.
//
// Module PUR, dérivé des codes OHADA déjà calculés par `computeOhada`.

export type Verdict = "conforme" | "à surveiller" | null;

export type RatioDef = {
  key: string;
  family: string;
  label: string;
  /** Formule, telle qu'écrite dans le modèle. */
  formula: string;
  /** Norme attendue, en clair. Vide quand le modèle n'en fixe pas. */
  norm: string;
  interpretation: string;
  /** Unité d'affichage. */
  unit: "%" | "x" | "FCFA";
  compute: (v: Record<string, number>) => number | null;
  /** Confronte la valeur à la norme. null quand le modèle n'en donne pas. */
  check?: (value: number) => boolean;
};

const div = (a: number, b: number): number | null => (b ? a / b : null);
const g = (v: Record<string, number>, code: string) => v[code] ?? 0;

/** Total des dettes : financières, circulantes et trésorerie-passif. */
const dettesTotales = (v: Record<string, number>) => g(v, "DD") + g(v, "DP") + g(v, "DT");

export const RATIO_LIBRARY: RatioDef[] = [
  // --- Équilibre financier
  {
    key: "bfre", family: "Équilibre financier", label: "Besoin en fonds de roulement d'exploitation",
    formula: "Stocks + créances clients − dettes fournisseurs", norm: "Le plus bas possible", unit: "FCFA",
    interpretation: "Un BFRE négatif indique que l'exploitation se finance elle-même.",
    compute: (v) => g(v, "BK") - g(v, "DP"),
  },
  {
    key: "frn", family: "Équilibre financier", label: "Fonds de roulement net",
    formula: "Ressources stables − actif immobilisé", norm: "Le plus élevé possible", unit: "FCFA",
    interpretation: "Un FRN positif indique que les emplois durables sont financés par des ressources durables.",
    compute: (v) => g(v, "DF") - g(v, "AZ"),
  },
  {
    key: "tn", family: "Équilibre financier", label: "Trésorerie nette",
    formula: "Trésorerie-actif − trésorerie-passif", norm: "Positive", unit: "FCFA",
    interpretation: "La trésorerie nette est la conséquence du fonds de roulement et du besoin en fonds de roulement.",
    compute: (v) => g(v, "BT") - g(v, "DT"), check: (x) => x >= 0,
  },
  {
    key: "caf", family: "Équilibre financier", label: "Capacité d'autofinancement",
    formula: "Résultat net + dotations aux amortissements et provisions", norm: "Positive", unit: "FCFA",
    interpretation: "Ce que l'entreprise dégage par elle-même pour investir et rembourser.",
    // Les dotations d'exploitation sont le poste RQ du plan OHADA retenu ici.
    compute: (v) => g(v, "XI") + g(v, "RQ"), check: (x) => x >= 0,
  },

  // --- Liquidité
  {
    key: "liquidite_courante", family: "Liquidité", label: "Liquidité courante",
    formula: "Actif circulant / passif circulant", norm: "> 1", unit: "x",
    interpretation: "Au-dessus de 1, l'entreprise peut honorer ses dettes à court terme avec son actif circulant.",
    compute: (v) => div(g(v, "BK") + g(v, "BT"), g(v, "DP") + g(v, "DT")), check: (x) => x > 1,
  },
  {
    key: "liquidite_rapide", family: "Liquidité", label: "Liquidité rapide",
    formula: "(Actif circulant − stocks) / passif circulant", norm: "> 1", unit: "x",
    interpretation: "Même lecture, stocks exclus : la capacité à payer sans avoir à vendre son stock.",
    compute: (v) => div(g(v, "BK") - g(v, "BB") + g(v, "BT"), g(v, "DP") + g(v, "DT")), check: (x) => x > 1,
  },

  // --- Rentabilité
  {
    key: "marge_ebe", family: "Rentabilité", label: "Taux de marge d'EBE",
    formula: "EBE / chiffre d'affaires", norm: "", unit: "%",
    interpretation: "Ce que l'exploitation dégage avant amortissements, intérêts et impôts.",
    compute: (v) => div(g(v, "XD"), g(v, "XB")),
  },
  {
    key: "marge_nette", family: "Rentabilité", label: "Marge nette",
    formula: "Résultat net / chiffre d'affaires", norm: "", unit: "%",
    interpretation: "Ce qui reste au terme de l'exercice, pour cent francs vendus.",
    compute: (v) => div(g(v, "XI"), g(v, "XB")),
  },
  {
    key: "roe", family: "Rentabilité", label: "Rendement des capitaux propres (ROE)",
    formula: "Résultat net / capitaux propres", norm: "", unit: "%",
    interpretation: "Évalue la rentabilité au regard des fonds investis par les actionnaires.",
    compute: (v) => div(g(v, "XI"), g(v, "CP")),
  },
  {
    key: "roa", family: "Rentabilité", label: "Rendement des actifs (ROA)",
    formula: "Résultat net / total actif", norm: "", unit: "%",
    interpretation: "Mesure la rentabilité de l'ensemble des actifs mobilisés.",
    compute: (v) => div(g(v, "XI"), g(v, "BZ")),
  },

  // --- Endettement et solvabilité
  {
    key: "endettement", family: "Endettement", label: "Ratio d'endettement",
    formula: "Dettes totales / total actif", norm: "< 1", unit: "x",
    interpretation: "En dessous de 1, les actifs couvrent les dettes.",
    compute: (v) => div(dettesTotales(v), g(v, "BZ")), check: (x) => x < 1,
  },
  {
    key: "autonomie", family: "Endettement", label: "Autonomie financière",
    formula: "Capitaux propres / dettes totales", norm: "> 0,5", unit: "x",
    interpretation: "Au-dessus de 0,5, l'entreprise dépend moins de ses créanciers.",
    compute: (v) => div(g(v, "CP"), dettesTotales(v)), check: (x) => x > 0.5,
  },
  {
    key: "fonds_propres", family: "Solvabilité", label: "Ratio de fonds propres",
    formula: "Capitaux propres / total actif", norm: "> 0,2", unit: "x",
    interpretation: "Au-dessus de 0,2, la part des fonds propres dans le financement est jugée saine.",
    compute: (v) => div(g(v, "CP"), g(v, "BZ")), check: (x) => x > 0.2,
  },

  // --- Efficacité
  {
    key: "rotation_actifs", family: "Efficacité", label: "Rotation des actifs",
    formula: "Chiffre d'affaires / total actif", norm: "", unit: "x",
    interpretation: "Mesure l'efficacité avec laquelle les actifs produisent du chiffre d'affaires.",
    compute: (v) => div(g(v, "XB"), g(v, "BZ")),
  },
  {
    key: "rotation_stocks", family: "Efficacité", label: "Rotation des stocks",
    formula: "Achats consommés / stocks", norm: "", unit: "x",
    interpretation: "Nombre de fois où le stock se renouvelle dans l'exercice.",
    compute: (v) => div(g(v, "RA") + g(v, "RD"), g(v, "BB")),
  },
];

export type RatioResult = RatioDef & { value: number | null; verdict: Verdict };

export function computeRatios(v: Record<string, number>): RatioResult[] {
  return RATIO_LIBRARY.map((r) => {
    const value = r.compute(v);
    const verdict: Verdict = value == null || !r.check ? null : r.check(value) ? "conforme" : "à surveiller";
    return { ...r, value, verdict };
  });
}

export const RATIO_FAMILIES = [...new Set(RATIO_LIBRARY.map((r) => r.family))];

// ---------------------------------------------------------------------------
// Bilan fonctionnel et soldes de gestion, avec la variation d'un exercice à l'autre.

export type AnalysisLine = { label: string; code?: string; value: number | null; share?: number | null };

/** Bilan fonctionnel complet, dans l'ordre du modèle. */
export function bilanFonctionnelComplet(v: Record<string, number>): { actif: AnalysisLine[]; passif: AnalysisLine[]; analyse: AnalysisLine[] } {
  const totalActif = g(v, "BZ");
  const totalPassif = g(v, "DZ");
  const part = (x: number, total: number) => (total ? x / total : null);

  return {
    actif: [
      { label: "Actif immobilisé", code: "AZ", value: g(v, "AZ"), share: part(g(v, "AZ"), totalActif) },
      { label: "Actif circulant", code: "BK", value: g(v, "BK"), share: part(g(v, "BK"), totalActif) },
      { label: "Trésorerie — actif", code: "BT", value: g(v, "BT"), share: part(g(v, "BT"), totalActif) },
      { label: "Total actif", code: "BZ", value: totalActif },
    ],
    passif: [
      { label: "Capitaux propres", code: "CP", value: g(v, "CP"), share: part(g(v, "CP"), totalPassif) },
      { label: "Dettes financières", code: "DD", value: g(v, "DD"), share: part(g(v, "DD"), totalPassif) },
      { label: "Ressources stables", code: "DF", value: g(v, "DF"), share: part(g(v, "DF"), totalPassif) },
      { label: "Passif circulant", code: "DP", value: g(v, "DP"), share: part(g(v, "DP"), totalPassif) },
      { label: "Trésorerie — passif", code: "DT", value: g(v, "DT"), share: part(g(v, "DT"), totalPassif) },
      { label: "Total passif", code: "DZ", value: totalPassif },
    ],
    analyse: [
      { label: "Fonds de roulement (FR)", value: g(v, "DF") - g(v, "AZ") },
      { label: "Besoin en fonds de roulement (BFR)", value: g(v, "BK") - g(v, "DP") },
      { label: "Trésorerie nette (TN)", value: g(v, "BT") - g(v, "DT") },
      { label: "Capacité d'autofinancement (CAF)", value: g(v, "XI") + g(v, "RQ") },
    ],
  };
}

/** Soldes du compte de résultat, avec leur poids dans le chiffre d'affaires. */
export function soldesDeGestion(v: Record<string, number>): AnalysisLine[] {
  const ca = g(v, "XB");
  const part = (x: number) => (ca ? x / ca : null);
  return [
    { label: "Chiffre d'affaires", code: "XB", value: ca, share: ca ? 1 : null },
    { label: "Valeur ajoutée", code: "XC", value: g(v, "XC"), share: part(g(v, "XC")) },
    { label: "Excédent brut d'exploitation", code: "XD", value: g(v, "XD"), share: part(g(v, "XD")) },
    { label: "Résultat d'exploitation", code: "XE", value: g(v, "XE"), share: part(g(v, "XE")) },
    { label: "Résultat financier", code: "XF", value: g(v, "XF"), share: part(g(v, "XF")) },
    { label: "Résultat net", code: "XI", value: g(v, "XI"), share: part(g(v, "XI")) },
  ];
}

/** Variation d'un exercice à l'autre, telle que le modèle l'affiche sous chaque ligne. */
export function variation(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

/**
 * Les jeux de ratios bancaires et assurantiels du modèle ne sont PAS calculés : ils
 * réclament des postes (actifs pondérés, primes émises, sinistres) que le plan OHADA
 * général ne porte pas. Les inventer donnerait des chiffres faux sous une étiquette
 * rassurante. Ils sont donc listés comme à collecter le jour où le fonds financera une
 * banque ou une assurance.
 */
export const SECTOR_RATIOS_PENDING = [
  { sector: "Banques (normes BCEAO)", ratios: ["Ratio de solvabilité (CAR)", "Ratio de liquidité (LCR)", "Ratio de crédit", "Effet de levier", "Marge d'intermédiation (NIM)", "Coefficient d'exploitation", "Coefficient de rentabilité financière", "Coefficient de rendement"] },
  { sector: "Assurances (normes UEMOA)", ratios: ["Ratio de solvabilité", "Marge de souscription", "Ratio combiné", "Ratio de rétention", "Ratio de liquidité", "Rotation des investissements", "Frais de gestion"] },
];
