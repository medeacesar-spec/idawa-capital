// Correspondance entre les colonnes d'un fichier partenaire et les champs d'un dossier.
//
// Trois principes tenus ici :
//  1. Rien n'est deviné en silence — chaque correspondance automatique est affichée et
//     modifiable, et les colonnes NON REPRISES sont listées plutôt qu'ignorées sans bruit.
//  2. Aucune valeur douteuse n'est écrite discrètement : un montant à 3 F CFA ou un
//     doublon de nom remonte en anomalie, à l'utilisateur de trancher.
//  3. Aucun rattachement à un programme : le dossier entre non assigné, il se range après.
//
// Module PUR : pas d'accès base, testable et utilisable côté client.

import { normalizeLabel, parseAmount, parseCount, parseDate, parsePercent } from "./table";

export type FieldKey =
  | "companyName" | "description" | "thesis" | "amount" | "ownershipTarget"
  | "sector" | "location" | "sourceDetail" | "expectedClose"
  | "contactName" | "contactEmail" | "contactPhone"
  | "employees" | "womenPct";

export type TargetField = {
  key: FieldKey;
  label: string;
  hint: string;
  required?: boolean;
  /** Libellés reconnus dans l'en-tête du fichier, du plus précis au plus général. */
  aliases: string[];
};

/** Les champs qu'un dossier peut recevoir d'un fichier. */
export const TARGET_FIELDS: TargetField[] = [
  { key: "companyName", label: "Nom du dossier", hint: "Nom de l'entreprise ou intitulé du projet", required: true,
    aliases: ["nom de la pme", "nom de l entreprise", "raison sociale", "titre du projet", "entreprise", "societe", "projet", "nom"] },
  { key: "description", label: "Description", hint: "Résumé de l'activité, repris sur la fiche",
    aliases: ["resume du projet", "resume", "description", "objet du projet", "presentation", "activite"] },
  { key: "thesis", label: "Thèse / analyse", hint: "Marché, positionnement, avantage concurrentiel",
    aliases: ["analyse du marche", "positionnement strategique", "these", "marche", "positionnement"] },
  { key: "amount", label: "Montant", hint: "Coût du projet ou besoin de financement, en FCFA",
    aliases: ["cout du projet", "montant du financement", "besoin de financement", "montant sollicite", "cout", "montant", "budget"] },
  { key: "ownershipTarget", label: "Part visée (%)", hint: "Pourcentage du capital",
    aliases: ["des parts", "part du capital", "pourcentage de parts", "participation", "capital detenu"] },
  { key: "sector", label: "Secteur / filière", hint: "Rapproché de la bibliothèque de sous-secteurs",
    aliases: ["filiere secteur", "secteur d activite", "filiere", "secteur", "domaine"] },
  { key: "location", label: "Localisation", hint: "Commune ou département",
    aliases: ["lieu", "localisation", "commune", "departement", "ville", "region"] },
  { key: "expectedClose", label: "Date", hint: "Date de dépôt ou de décision attendue",
    aliases: ["date de la saisie", "date de depot", "date prevue", "date"] },
  { key: "sourceDetail", label: "Précision sur la source", hint: "Programme, opérateur ou personne à l'origine",
    aliases: ["source", "origine", "apporteur", "operateur", "partenaire"] },
  { key: "contactName", label: "Contact — nom", hint: "Un contact est créé et rattaché au dossier",
    aliases: ["nom du promoteur principal", "prenom et nom", "porteur du projet", "porteuse du projet", "promoteur", "dirigeant", "contact", "gerant"] },
  { key: "contactEmail", label: "Contact — email", hint: "",
    aliases: ["mail du promoteur principal", "email", "mail", "adresse electronique", "courriel"] },
  { key: "contactPhone", label: "Contact — téléphone", hint: "",
    aliases: ["tel du promoteur principal", "telephone", "tel", "portable", "contact telephonique"] },
  { key: "employees", label: "Effectif", hint: "Repris dans la description",
    aliases: ["nombre d employes", "nombre d employe", "effectif", "employes", "salaries"] },
  { key: "womenPct", label: "% de femmes", hint: "Repris dans la description",
    aliases: ["de femmes employees", "part des femmes", "pourcentage de femmes", "femmes"] },
];

/** colonne -> champ, ou null si la colonne n'est pas reprise. */
export type Mapping = Record<number, FieldKey | null>;

/**
 * Compare un en-tête à un alias, MOT À MOT.
 *
 * La comparaison caractère par caractère est un piège : l'alias « nom » commence bien
 * la chaîne « nombre », et un fichier de projets s'est retrouvé avec 98 dossiers
 * nommés « 1 » parce que la colonne « nombre » avait été prise pour le nom. On exige
 * donc des mots entiers.
 */
function scoreHeader(headerWords: string[], alias: string): number {
  const aliasWords = alias.split(" ").filter(Boolean);
  if (!aliasWords.length || !headerWords.length) return 0;

  const joined = headerWords.join(" ");
  if (joined === alias) return 100;

  const startsWithAlias = aliasWords.every((w, i) => headerWords[i] === w);
  if (startsWithAlias) return 60 + aliasWords.length;

  const allPresent = aliasWords.every((w) => headerWords.includes(w));
  // Un alias d'un seul mot court (« nom », « tel ») noyé dans un long en-tête ne prouve rien.
  if (allPresent && (aliasWords.length > 1 || alias.length >= 5)) return 30 + aliasWords.length;

  return 0;
}

/**
 * Propose une correspondance à partir des en-têtes.
 *
 * L'attribution est GLOBALE : on calcule tous les couples (colonne, champ) possibles,
 * puis on attribue par score décroissant. Attribuer colonne par colonne laisserait
 * la première colonne rencontrée confisquer un champ qu'une colonne suivante méritait
 * mieux — c'est ainsi que « Catégorie projet » avait raflé le secteur au détriment de
 * « Filière/Secteur ».
 */
export function autoMap(headers: string[]): Mapping {
  const mapping: Mapping = {};
  headers.forEach((_, i) => { mapping[i] = null; });

  const candidates: { col: number; key: FieldKey; score: number }[] = [];
  headers.forEach((h, i) => {
    const words = normalizeLabel(h).split(" ").filter(Boolean);
    if (!words.length) return;
    for (const f of TARGET_FIELDS) {
      let best = 0;
      for (const a of f.aliases) best = Math.max(best, scoreHeader(words, a));
      if (best > 0) candidates.push({ col: i, key: f.key, score: best });
    }
  });

  // À score égal, la colonne la plus à gauche gagne : les fichiers rangent
  // l'information principale avant les colonnes de détail.
  candidates.sort((a, b) => b.score - a.score || a.col - b.col);

  const takenFields = new Set<FieldKey>();
  const takenCols = new Set<number>();
  for (const c of candidates) {
    if (takenFields.has(c.key) || takenCols.has(c.col)) continue;
    mapping[c.col] = c.key;
    takenFields.add(c.key);
    takenCols.add(c.col);
  }
  return mapping;
}

// ---------------------------------------------------------------------------

export type DealDraft = {
  /** Index de la ligne dans le fichier, tel qu'Excel l'affiche — pour retrouver la source. */
  sourceRow: number;
  companyName: string;
  description: string | null;
  thesis: string | null;
  amount: number | null;
  ownershipTarget: number | null;
  sector: string | null;
  location: string | null;
  expectedClose: string | null;
  sourceDetail: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  employees: number | null;
  womenPct: number | null;
  /** Ce qui empêche ou fragilise la reprise de cette ligne. */
  issues: Issue[];
};

export type Issue = { level: "bloquant" | "attention"; message: string };

const clean = (v: string | undefined): string | null => {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
};

/** Seuil au-dessous duquel un « coût de projet » est presque sûrement une erreur de saisie. */
const MIN_PLAUSIBLE_AMOUNT = 100_000;

export function buildDrafts(rows: string[][], mapping: Mapping, headerRow: number): DealDraft[] {
  const colOf = (key: FieldKey): number | null => {
    const found = Object.entries(mapping).find(([, k]) => k === key);
    return found ? Number(found[0]) : null;
  };
  const cell = (row: string[], key: FieldKey): string | null => {
    const c = colOf(key);
    return c == null ? null : clean(row[c]);
  };

  const seen = new Map<string, number>();

  return rows.map((row, i) => {
    const issues: Issue[] = [];
    const name = cell(row, "companyName");
    const rawAmount = cell(row, "amount");
    const amount = rawAmount == null ? null : parseAmount(rawAmount);
    const email = cell(row, "contactEmail");

    if (!name) issues.push({ level: "bloquant", message: "Sans nom, le dossier ne peut pas être créé." });
    else {
      const key = normalizeLabel(name);
      const first = seen.get(key);
      if (first != null) issues.push({ level: "attention", message: `Même nom que la ligne ${first} du fichier.` });
      else seen.set(key, headerRow + 2 + i);
    }

    if (rawAmount != null && amount == null) {
      issues.push({ level: "attention", message: `Montant illisible : « ${rawAmount} ». Le dossier entrera sans montant.` });
    } else if (amount != null && amount > 0 && amount < MIN_PLAUSIBLE_AMOUNT) {
      issues.push({ level: "attention", message: `Montant très faible (${amount.toLocaleString("fr-FR")} FCFA) — sans doute une saisie incomplète.` });
    }

    if (email && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
      issues.push({ level: "attention", message: `Adresse email douteuse : « ${email} ».` });
    }

    return {
      sourceRow: headerRow + 2 + i,
      companyName: name ?? "",
      description: cell(row, "description"),
      thesis: cell(row, "thesis"),
      amount,
      ownershipTarget: parsePercent(cell(row, "ownershipTarget") ?? ""),
      sector: cell(row, "sector"),
      location: cell(row, "location"),
      expectedClose: parseDate(cell(row, "expectedClose") ?? ""),
      sourceDetail: cell(row, "sourceDetail"),
      contactName: cell(row, "contactName"),
      contactEmail: email,
      contactPhone: cell(row, "contactPhone"),
      employees: parseCount(cell(row, "employees") ?? ""),
      womenPct: parsePercent(cell(row, "womenPct") ?? ""),
      issues,
    };
  });
}

/**
 * Complète la description avec ce qui n'a pas de champ dédié sur un dossier
 * (localisation, effectif, part de femmes). Mieux vaut le garder en clair sur la fiche
 * que le perdre à l'import.
 */
export function composedDescription(d: DealDraft): string | null {
  const extras: string[] = [];
  if (d.location) extras.push(`Localisation : ${d.location}`);
  if (d.employees != null) extras.push(`Effectif : ${d.employees}`);
  if (d.womenPct != null) extras.push(`Femmes : ${Math.round(d.womenPct)} %`);
  const parts = [d.description, extras.length ? extras.join(" · ") : null].filter(Boolean);
  return parts.length ? parts.join("\n\n") : null;
}

/** Rapproche un libellé de filière du sous-secteur le plus proche de la bibliothèque. */
export function matchSubSector(label: string | null, subSectors: { id: string; name: string }[]): string | null {
  if (!label) return null;
  const norm = normalizeLabel(label);
  if (!norm) return null;

  const exact = subSectors.find((s) => normalizeLabel(s.name) === norm);
  if (exact) return exact.id;

  // À défaut, le sous-secteur dont le nom est contenu dans le libellé (ou l'inverse),
  // en retenant le plus long : « Transformation agroalimentaire » plutôt que « Agro ».
  let best: { id: string; len: number } | null = null;
  for (const s of subSectors) {
    const n = normalizeLabel(s.name);
    if (n.length < 4) continue;
    if (norm.includes(n) || n.includes(norm)) {
      if (!best || n.length > best.len) best = { id: s.id, len: n.length };
    }
  }
  return best?.id ?? null;
}
