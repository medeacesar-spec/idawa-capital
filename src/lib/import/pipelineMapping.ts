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
    aliases: ["des parts", "part visee", "pourcentage de parts", "participation visee"] },
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
    aliases: ["de femmes employees", "part des femmes", "pourcentage de femmes", "taux de femmes"] },
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

  // Depuis qu'une colonne non reprise est CONSERVÉE plutôt que perdue, une correspondance
  // douteuse coûte plus cher que pas de correspondance du tout : on n'accepte donc que
  // les libellés qui correspondent exactement ou qui commencent par l'alias.
  const strong = candidates.filter((c) => c.score >= 60);

  // À score égal, la colonne la plus à gauche gagne : les fichiers rangent
  // l'information principale avant les colonnes de détail.
  strong.sort((a, b) => b.score - a.score || a.col - b.col);

  const takenFields = new Set<FieldKey>();
  const takenCols = new Set<number>();
  for (const c of strong) {
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
  /** Toutes les colonnes du fichier sans champ dédié, conservées telles quelles. */
  extras: { label: string; value: string }[];
  /** Lignes du fichier regroupées sous ce dossier (une PME peut y figurer chaque mois). */
  mergedRows: number[];
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  employees: number | null;
  womenPct: number | null;
  /** Ce qui empêche ou fragilise la reprise de cette ligne. */
  issues: Issue[];
};

/** « information » n'est pas un défaut : c'est ce que l'outil a fait de la ligne. */
export type Issue = { level: "bloquant" | "attention" | "information"; message: string };

const clean = (v: string | undefined): string | null => {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
};

/** Seuil au-dessous duquel un « coût de projet » est presque sûrement une erreur de saisie. */
const MIN_PLAUSIBLE_AMOUNT = 100_000;

/**
 * Transforme les lignes du fichier en dossiers, et signale ce qui cloche.
 *
 * Les colonnes sans champ dédié ne sont PAS jetées : elles sont rangées dans `extras`
 * et reprises sur la fiche. Un fichier partenaire vaut par tout ce qu'il porte, pas par
 * la douzaine de colonnes qui tombent dans nos cases.
 */
export function buildDrafts(
  rows: string[][],
  columns: { header: string }[],
  mapping: Mapping,
  headerRow: number,
): DealDraft[] {
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

    // Une colonne prise pour un taux alors qu'elle porte un effectif ou une date donne
    // des « 45 987 % » : mieux vaut ne rien retenir et le dire.
    const pct = (key: FieldKey, label: string): number | null => {
      const v = parsePercent(cell(row, key) ?? "");
      if (v == null) return null;
      if (v < 0 || v > 100) {
        issues.push({ level: "attention", message: `${label} hors bornes (${v}) — non repris comme pourcentage.` });
        return null;
      }
      return v;
    };

    if (email && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
      issues.push({ level: "attention", message: `Adresse email douteuse : « ${email} ».` });
    }

    return {
      sourceRow: headerRow + 2 + i,
      companyName: name ?? "",
      description: cell(row, "description"),
      thesis: cell(row, "thesis"),
      amount,
      ownershipTarget: pct("ownershipTarget", "Part visée"),
      sector: cell(row, "sector"),
      location: cell(row, "location"),
      expectedClose: parseDate(cell(row, "expectedClose") ?? ""),
      sourceDetail: cell(row, "sourceDetail"),
      extras: columns
        .map((c, n) => ({ label: c.header, value: (row[n] ?? "").trim() }))
        .filter((x, n) => !mapping[n] && x.value !== ""),
      mergedRows: [],
      contactName: cell(row, "contactName"),
      contactEmail: email,
      contactPhone: cell(row, "contactPhone"),
      employees: parseCount(cell(row, "employees") ?? ""),
      womenPct: pct("womenPct", "Part de femmes"),
      issues,
    };
  });
}

/**
 * Regroupe les lignes qui décrivent la MÊME entreprise.
 *
 * Certains fichiers ne sont pas des listes d'entreprises mais des suivis périodiques :
 * le rapportage mensuel de l'ADPME compte 404 lignes pour 248 PME, chacune revenant
 * chaque mois. Sans regroupement, l'import créerait 404 dossiers dont 156 en double.
 *
 * La ligne retenue est la PLUS RÉCENTE (date renseignée, à défaut la dernière du
 * fichier) : c'est l'état le plus à jour de l'entreprise. Les valeurs absentes de
 * cette ligne sont complétées par les lignes précédentes plutôt que perdues — un
 * numéro de téléphone saisi une seule fois, en janvier, doit survivre à l'import.
 */
export function groupByCompany(drafts: DealDraft[]): DealDraft[] {
  const groups = new Map<string, DealDraft[]>();
  for (const d of drafts) {
    const key = normalizeLabel(d.companyName);
    if (!key) continue; // les lignes sans nom restent traitées à part
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }

  const out: DealDraft[] = [];
  for (const rows of groups.values()) {
    if (rows.length === 1) { out.push({ ...rows[0], mergedRows: [] }); continue; }

    const sorted = [...rows].sort((a, b) => {
      if (a.expectedClose && b.expectedClose) return a.expectedClose.localeCompare(b.expectedClose);
      if (a.expectedClose) return -1;
      if (b.expectedClose) return 1;
      return a.sourceRow - b.sourceRow;
    });
    const latest = sorted[sorted.length - 1];

    // Complétion : on ne remplace jamais une valeur de la ligne retenue, on comble ses trous.
    const merged: DealDraft = { ...latest, mergedRows: rows.map((r) => r.sourceRow).sort((a, b) => a - b) };
    const fillable = ["description", "thesis", "sector", "location", "sourceDetail",
      "contactName", "contactEmail", "contactPhone"] as const;
    const numeric = ["amount", "ownershipTarget", "employees", "womenPct"] as const;

    // Les colonnes conservées se complètent aussi : une PME peut n'avoir déclaré son
    // chiffre d'affaires qu'une fois dans l'année, et cette valeur doit survivre.
    const extras = new Map(merged.extras.map((x) => [x.label, x.value]));

    for (let i = sorted.length - 2; i >= 0; i--) {
      const older = sorted[i];
      for (const k of fillable) if (merged[k] == null && older[k] != null) merged[k] = older[k];
      for (const k of numeric) if (merged[k] == null && older[k] != null) merged[k] = older[k];
      for (const x of older.extras) if (!extras.has(x.label)) extras.set(x.label, x.value);
    }
    merged.extras = [...extras].map(([label, value]) => ({ label, value }));

    // Le doublon n'en est plus un : on retire l'alerte et on explique le regroupement.
    merged.issues = latest.issues.filter((x) => !x.message.startsWith("Même nom"));
    merged.issues.unshift({
      level: "information",
      message: `${rows.length} lignes regroupées (${merged.mergedRows.join(", ")}) — la plus récente fait foi.`,
    });
    out.push(merged);
  }

  // Les lignes sans nom sont conservées telles quelles : elles portent leur propre blocage.
  out.push(...drafts.filter((d) => !normalizeLabel(d.companyName)));
  return out.sort((a, b) => a.sourceRow - b.sourceRow);
}

/** Reconnaît une colonne de chiffre d'affaires déclaré, pour la remonter en tête. */
const REVENUE = /chiffre d affaire|chiffres d affaire|ca annee|turnover/;

/**
 * Construit la description du dossier de façon à ce que RIEN du fichier ne se perde.
 *
 * Trois blocs : le résumé s'il existe, les repères d'identité (localisation, effectif),
 * puis TOUTES les colonnes sans champ dédié, libellé par libellé. Les chiffres d'affaires
 * déclarés viennent en premier de ce dernier bloc : sur un fichier de suivi, c'est
 * l'information qu'on est allé chercher.
 *
 * Ces données vivent dans la description faute d'un champ propre — la base ne bouge pas
 * pendant la période de tests. Le jour où l'on voudra les interroger, elles seront là.
 */
export function composedDescription(d: DealDraft): string | null {
  const repere: string[] = [];
  if (d.location) repere.push(`Localisation : ${d.location}`);
  if (d.employees != null) repere.push(`Effectif : ${d.employees}`);
  if (d.womenPct != null) repere.push(`Femmes : ${Math.round(d.womenPct)} %`);

  const revenue = d.extras.filter((x) => REVENUE.test(normalizeLabel(x.label)));
  const others = d.extras.filter((x) => !REVENUE.test(normalizeLabel(x.label)));

  const blocks: string[] = [];
  if (d.description) blocks.push(d.description);
  if (repere.length) blocks.push(repere.join(" · "));
  if (revenue.length) {
    blocks.push("Chiffres d'affaires déclarés\n" + revenue.map((x) => `${x.label} : ${x.value}`).join("\n"));
  }
  if (others.length) {
    blocks.push("Informations reprises du fichier\n" + others.map((x) => `${x.label} : ${x.value}`).join("\n"));
  }
  return blocks.length ? blocks.join("\n\n") : null;
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
