// Alimentation automatique des KPIs financiers.
//
// Beaucoup de KPIs suivis (chiffre d'affaires, EBE, résultat net, BFR, marges…) sont déjà
// contenus dans les états financiers OHADA saisis par ailleurs. Les ressaisir à la main,
// c'est doubler le travail et risquer deux chiffres divergents pour la même réalité.
// On les dérive donc de la source comptable, à la demande et après vérification.

import { computeOhada, bilanFonctionnel, ratios } from "./ohada";

export type KpiSource = {
  /** Reconnaissance du KPI suivi par son nom, quelle que soit sa rédaction. */
  match: RegExp;
  /** Ce qui est montré à l'utilisateur pour justifier le chiffre. */
  origin: string;
  unit: "FCFA" | "%" | "x";
  compute: (v: Record<string, number>) => number | null;
};

const pct = (r: number | null) => (r == null ? null : r * 100);

// L'ordre compte : la première correspondance gagne, donc les libellés les plus
// spécifiques doivent précéder les plus généraux (« taux d'EBE » avant « EBE »).
export const KPI_SOURCES: KpiSource[] = [
  { match: /taux\s*d.?\s*ebe|marge\s*d.?\s*ebe|marge\s*ebe/i, origin: "EBE / Chiffre d'affaires (XD ÷ XB)", unit: "%",
    compute: (v) => pct(ratios(v).margeEbe) },
  { match: /marge\s*nette/i, origin: "Résultat net / Chiffre d'affaires (XI ÷ XB)", unit: "%",
    compute: (v) => pct(ratios(v).margeNette) },
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
    compute: (v) => v.XB ?? null },
  { match: /valeur\s*ajout/i, origin: "Valeur ajoutée (XC)", unit: "FCFA",
    compute: (v) => v.XC ?? null },
  // EBITDA est l'appellation anglo-saxonne du même solde : la traiter à part créerait
  // deux chiffres pour une seule réalité.
  { match: /exc.dent\s*brut|\bebe\b|\bebitda\b/i, origin: "Excédent brut d'exploitation (XD)", unit: "FCFA",
    compute: (v) => v.XD ?? null },
  { match: /r.sultat\s*d.?\s*exploitation/i, origin: "Résultat d'exploitation (XE)", unit: "FCFA",
    compute: (v) => v.XE ?? null },
  { match: /r.sultat\s*net|b.n.fice\s*net/i, origin: "Résultat net (XI)", unit: "FCFA",
    compute: (v) => v.XI ?? null },

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

export type DerivedValue = { year: number; value: number; origin: string; unit: string };

/** Valeurs dérivables pour un KPI donné, exercice par exercice. */
export function derive(kpiName: string, statements: Record<number, Record<string, number>>): DerivedValue[] {
  const src = sourceFor(kpiName);
  if (!src) return [];
  const out: DerivedValue[] = [];
  for (const year of Object.keys(statements).map(Number).sort((a, b) => a - b)) {
    const computed = computeOhada(statements[year] ?? {});
    const value = src.compute(computed);
    if (value == null || !Number.isFinite(value)) continue;
    // Un état financier incomplet produit des zéros qui n'ont rien de comptable : le poste
    // n'est simplement pas renseigné. Écrire ce 0 dans l'historique du KPI le rendrait faux
    // et donnerait une courbe mensongère. On préfère ne rien proposer : un exercice
    // réellement nul se saisit à la main, c'est assez rare pour le justifier.
    if (value === 0) continue;
    out.push({ year, value: Math.round(value * 100) / 100, origin: src.origin, unit: src.unit });
  }
  return out;
}
