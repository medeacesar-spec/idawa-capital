// Grille de notation d'impact IPDEV 2, reprise à l'identique de l'outil d'analyse ESG
// d'I&P (onglet « 1.2 Rating Impact »).
//
// Jusqu'ici l'application demandait de saisir un score et son maximum à la main : il
// fallait connaître la grille, la dérouler ailleurs, puis reporter un total. C'est la
// double saisie que ce projet combat partout. On pose donc la grille elle-même, et le
// total se calcule.
//
// Total de base : Employés 12 + Clients 4 + Contractants 4 + Entrepreneurs 12 = 32.
// Les bonus s'ajoutent PAR-DESSUS les 32 points — ils ne relèvent pas le maximum.
//
// Module PUR : aucun accès base, utilisable côté client.

export type Choice = { score: number; label: string };
export type Criterion = {
  key: string;
  label: string;
  help?: string;
  choices: Choice[];
};
export type Dimension = {
  key: string;
  /** Doit correspondre au libellé stocké dans esg_impact_ratings.dimension. */
  label: string;
  objective: string;
  max: number;
  criteria: Criterion[];
};

/** Échelle à trois marches, la plus fréquente dans la grille. */
const TRIPLE: Choice[] = [
  { score: 0, label: "Pas du tout" },
  { score: 1, label: "Partiellement" },
  { score: 2, label: "Totalement" },
];

export const IMPACT_DIMENSIONS: Dimension[] = [
  {
    key: "employes",
    label: "Employés",
    objective: "Créer des emplois décents",
    max: 12,
    criteria: [
      {
        key: "emp_quanti",
        label: "Impact quantitatif sur les employés",
        help: "Emplois à créer pour 100 000 € investis.",
        choices: [
          { score: 0, label: "Très faible création, voire risque de destruction d'emplois" },
          { score: 2, label: "Création faible : moins de 5 emplois pour 100 000 € investis" },
          { score: 4, label: "Création importante : environ 5 à 10 emplois" },
          { score: 6, label: "Forte création : plus de 10 emplois" },
        ],
      },
      {
        key: "emp_salaire",
        label: "Rémunération décente et équitable",
        help: "Se référer à la grille des salaires décents.",
        choices: TRIPLE,
      },
      {
        key: "emp_conditions",
        label: "Assurance maladie et conditions de travail",
        help: "Y compris le temps de travail.",
        choices: TRIPLE,
      },
      {
        key: "emp_inclusion",
        label: "Part significative de femmes (> 30 %) ou de personnes exclues du marché du travail",
        help: "Jeunes sans qualification, personnes en situation de handicap, populations rurales isolées.",
        choices: TRIPLE,
      },
    ],
  },
  {
    key: "clients",
    label: "Clients",
    objective: "Répondre à la demande en biens et services essentiels",
    max: 4,
    criteria: [
      { key: "cli_deficit", label: "Comble un déficit d'offre locale, en quantité et/ou en qualité", choices: TRIPLE },
      { key: "cli_essentiel", label: "Si B2C : bien ou service de première nécessité, luttant contre la pauvreté", choices: TRIPLE },
    ],
  },
  {
    key: "contractants",
    label: "Contractants",
    objective: "Développer les fournisseurs et distributeurs locaux",
    max: 4,
    criteria: [
      { key: "con_commandes", label: "Développement des fournisseurs ou distributeurs locaux par des commandes importantes", choices: TRIPLE },
      { key: "con_structuration", label: "Rôle moteur dans la structuration des fournisseurs ou distributeurs locaux", choices: TRIPLE },
    ],
  },
  {
    key: "entrepreneurs",
    label: "Entrepreneurs",
    objective: "Faire émerger un entrepreneuriat durable",
    max: 12,
    criteria: [
      {
        key: "ent_locaux",
        label: "Soutien aux entrepreneurs et managers locaux",
        choices: [
          { score: 0, label: "Ni les entrepreneurs, ni les dirigeants ne sont africains" },
          { score: 2, label: "Au moins un entrepreneur ou un dirigeant est africain ou installé durablement en Afrique" },
          { score: 4, label: "Au moins un entrepreneur est africain et tous les dirigeants le sont" },
          { score: 6, label: "Tous les entrepreneurs et tous les dirigeants sont africains" },
        ],
      },
      {
        key: "ent_additionalite",
        label: "Additionnalité du soutien financier et effet de levier",
        choices: [
          { score: 0, label: "Le projet peut se faire sans nous, à conditions équivalentes" },
          { score: 2, label: "Le projet peut se faire sans nous mais devrait être revu à la baisse" },
          { score: 4, label: "Le projet ne peut pas se faire sans nous" },
          { score: 6, label: "Le projet ne peut pas se faire sans nous, et notre investissement fait levier sur d'autres financements" },
        ],
      },
    ],
  },
];

/** Libellé de la dimension « bonus », stockée à part car elle ne relève pas le maximum. */
export const BONUS_LABEL = "Bonus";

export const BONUS_CRITERIA: Criterion[] = [
  {
    key: "bon_bop",
    label: "Populations vulnérables (BOP)",
    help: "L'entreprise cible des populations au niveau du seuil de pauvreté ou des populations rurales.",
    choices: TRIPLE,
  },
  {
    key: "bon_certification",
    label: "Certification",
    help: "Certification environnementale, sociale ou de qualité, obtenue ou en cours de demande. Barème non précisé dans l'outil source : Non = 0, Oui = 2.",
    choices: [{ score: 0, label: "Non" }, { score: 2, label: "Oui" }],
  },
  {
    key: "bon_technologie",
    label: "Transfert de technologie ou de compétences",
    help: "Technologie ou compétences nouvelles dans le pays, susceptibles d'être diffusées. Barème non précisé dans l'outil source : Non = 0, Oui = 2.",
    choices: [{ score: 0, label: "Non" }, { score: 2, label: "Oui" }],
  },
  {
    key: "bon_environnement",
    label: "Bonus / malus environnemental",
    choices: [
      { score: -2, label: "Impact négatif difficilement atténuable" },
      { score: 0, label: "Impact faible, réduit par des mesures internes ou compensé" },
      { score: 2, label: "Impact positif et particulièrement significatif" },
    ],
  },
];

/** Réponses saisies : clé de critère -> score retenu. */
export type Answers = Record<string, number>;

export const BASE_MAX = IMPACT_DIMENSIONS.reduce((s, d) => s + d.max, 0); // 32

export function dimensionScore(dim: Dimension, answers: Answers): number {
  return dim.criteria.reduce((s, c) => s + (answers[c.key] ?? 0), 0);
}

export function baseScore(answers: Answers): number {
  return IMPACT_DIMENSIONS.reduce((s, d) => s + dimensionScore(d, answers), 0);
}

export function bonusScore(answers: Answers): number {
  return BONUS_CRITERIA.reduce((s, c) => s + (answers[c.key] ?? 0), 0);
}

/** Nombre de critères renseignés — sert à dire si la notation est complète. */
export function answeredCount(answers: Answers): { answered: number; total: number } {
  const keys = [...IMPACT_DIMENSIONS.flatMap((d) => d.criteria), ...BONUS_CRITERIA].map((c) => c.key);
  return { answered: keys.filter((k) => answers[k] != null).length, total: keys.length };
}

/**
 * Note sur 3 attendue par l'analyse « Risque / Impact / Rentabilité » du comité.
 * Le rating d'impact vaut sur 32 ; le comité raisonne sur 3. On ramène par tiers,
 * sans arrondi flatteur : il faut atteindre le seuil pour décrocher la note.
 */
export function noteOnThree(total: number): number {
  const pct = (total / BASE_MAX) * 100;
  if (pct >= 66) return 3;
  if (pct >= 40) return 2;
  return 1;
}

/** Les réponses sont conservées dans `note` faute de table dédiée — voir le composant. */
export function encodeAnswers(answers: Answers): string {
  return JSON.stringify(answers);
}

export function decodeAnswers(note: string | null): Answers {
  if (!note) return {};
  try {
    const parsed: unknown = JSON.parse(note);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Answers = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number") out[k] = v;
    }
    return out;
  } catch {
    // Une note écrite à la main avant la grille n'est pas du JSON : on la laisse tranquille.
    return {};
  }
}
