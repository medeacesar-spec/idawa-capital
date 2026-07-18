// Plan comptable OHADA / SYSCOHADA — états financiers d'une entreprise.
// Les lignes « saisie » sont renseignées par l'utilisateur ; les lignes « calcul »
// (totaux, soldes intermédiaires de gestion) sont dérivées automatiquement.
// Convention : les charges sont saisies en POSITIF et soustraites par les formules.

export type OhadaSection = "actif" | "passif" | "resultat";
export type OhadaLine = {
  code: string;
  label: string;
  section: OhadaSection;
  kind: "input" | "total";
  /** Codes additionnés (+) et soustraits (−) pour les lignes calculées. */
  plus?: string[];
  minus?: string[];
  /** Ligne mise en avant (solde clé). */
  key?: boolean;
};

const L = (code: string, label: string, section: OhadaSection): OhadaLine => ({ code, label, section, kind: "input" });
const T = (code: string, label: string, section: OhadaSection, plus: string[], minus: string[] = [], key = false): OhadaLine =>
  ({ code, label, section, kind: "total", plus, minus, key });

/* ---------------- BILAN — ACTIF ---------------- */
export const OHADA_ACTIF: OhadaLine[] = [
  L("AE", "Frais de développement et de prospection", "actif"),
  L("AF", "Brevets, licences, logiciels et droits similaires", "actif"),
  L("AG", "Fonds commercial et droit au bail", "actif"),
  L("AH", "Autres immobilisations incorporelles", "actif"),
  T("AD", "IMMOBILISATIONS INCORPORELLES", "actif", ["AE", "AF", "AG", "AH"]),
  L("AJ", "Terrains", "actif"),
  L("AK", "Bâtiments", "actif"),
  L("AL", "Aménagements, agencements et installations", "actif"),
  L("AM", "Matériel, mobilier et actifs biologiques", "actif"),
  L("AN", "Matériel de transport", "actif"),
  L("AP", "Avances et acomptes versés sur immobilisations", "actif"),
  T("AI", "IMMOBILISATIONS CORPORELLES", "actif", ["AJ", "AK", "AL", "AM", "AN", "AP"]),
  L("AR", "Titres de participation", "actif"),
  L("AS", "Autres immobilisations financières", "actif"),
  T("AQ", "IMMOBILISATIONS FINANCIÈRES", "actif", ["AR", "AS"]),
  T("AZ", "TOTAL ACTIF IMMOBILISÉ", "actif", ["AD", "AI", "AQ"], [], true),
  L("BA", "Actif circulant HAO", "actif"),
  L("BB", "Stocks et encours", "actif"),
  L("BH", "Fournisseurs, avances versées", "actif"),
  L("BI", "Clients", "actif"),
  L("BJ", "Autres créances", "actif"),
  T("BG", "CRÉANCES ET EMPLOIS ASSIMILÉS", "actif", ["BH", "BI", "BJ"]),
  T("BK", "TOTAL ACTIF CIRCULANT", "actif", ["BA", "BB", "BG"], [], true),
  L("BQ", "Titres de placement", "actif"),
  L("BR", "Valeurs à encaisser", "actif"),
  L("BS", "Banques, chèques postaux, caisse et assimilés", "actif"),
  T("BT", "TOTAL TRÉSORERIE — ACTIF", "actif", ["BQ", "BR", "BS"], [], true),
  L("BU", "Écart de conversion — Actif", "actif"),
  T("BZ", "TOTAL GÉNÉRAL ACTIF", "actif", ["AZ", "BK", "BT", "BU"], [], true),
];

/* ---------------- BILAN — PASSIF ---------------- */
export const OHADA_PASSIF: OhadaLine[] = [
  L("CA", "Capital", "passif"),
  L("CB", "Apporteurs, capital non appelé (−)", "passif"),
  L("CD", "Primes liées au capital social", "passif"),
  L("CE", "Écarts de réévaluation", "passif"),
  L("CF", "Réserves indisponibles", "passif"),
  L("CG", "Réserves libres", "passif"),
  L("CH", "Report à nouveau (+ ou −)", "passif"),
  L("CJ", "Résultat net de l'exercice", "passif"),
  L("CL", "Subventions d'investissement", "passif"),
  L("CM", "Provisions réglementées", "passif"),
  T("CP", "TOTAL CAPITAUX PROPRES", "passif", ["CA", "CD", "CE", "CF", "CG", "CH", "CJ", "CL", "CM"], ["CB"], true),
  L("DA", "Emprunts et dettes financières diverses", "passif"),
  L("DB", "Dettes de location acquisition", "passif"),
  L("DC", "Provisions pour risques et charges", "passif"),
  T("DD", "TOTAL DETTES FINANCIÈRES", "passif", ["DA", "DB", "DC"], [], true),
  T("DF", "TOTAL RESSOURCES STABLES", "passif", ["CP", "DD"], [], true),
  L("DH", "Dettes circulantes HAO", "passif"),
  L("DI", "Clients, avances reçues", "passif"),
  L("DJ", "Fournisseurs d'exploitation", "passif"),
  L("DK", "Dettes fiscales et sociales", "passif"),
  L("DM", "Autres dettes", "passif"),
  L("DN", "Provisions pour risques à court terme", "passif"),
  T("DP", "TOTAL PASSIF CIRCULANT", "passif", ["DH", "DI", "DJ", "DK", "DM", "DN"], [], true),
  L("DQ", "Banques, crédits d'escompte", "passif"),
  L("DR", "Banques et crédits de trésorerie", "passif"),
  T("DT", "TOTAL TRÉSORERIE — PASSIF", "passif", ["DQ", "DR"], [], true),
  L("DV", "Écart de conversion — Passif", "passif"),
  T("DZ", "TOTAL GÉNÉRAL PASSIF", "passif", ["DF", "DP", "DT", "DV"], [], true),
];

/* ---------------- COMPTE DE RÉSULTAT ---------------- */
export const OHADA_RESULTAT: OhadaLine[] = [
  L("TA", "Ventes de marchandises", "resultat"),
  L("RA", "Achats de marchandises", "resultat"),
  L("RB", "Variation de stocks de marchandises", "resultat"),
  T("XA", "MARGE COMMERCIALE", "resultat", ["TA"], ["RA", "RB"], true),
  L("TB", "Ventes de produits fabriqués", "resultat"),
  L("TC", "Travaux, services vendus", "resultat"),
  L("TD", "Produits accessoires", "resultat"),
  T("XB", "CHIFFRE D'AFFAIRES", "resultat", ["TA", "TB", "TC", "TD"], [], true),
  L("TE", "Production stockée (ou déstockage)", "resultat"),
  L("TF", "Production immobilisée", "resultat"),
  L("TG", "Subventions d'exploitation", "resultat"),
  L("TH", "Autres produits", "resultat"),
  L("TI", "Transferts de charges d'exploitation", "resultat"),
  L("RC", "Achats de matières premières et fournitures liées", "resultat"),
  L("RD", "Variation de stocks de matières premières", "resultat"),
  L("RE", "Autres achats", "resultat"),
  L("RF", "Variation de stocks d'autres approvisionnements", "resultat"),
  L("RG", "Transports", "resultat"),
  L("RH", "Services extérieurs", "resultat"),
  L("RI", "Impôts et taxes", "resultat"),
  L("RJ", "Autres charges", "resultat"),
  T("XC", "VALEUR AJOUTÉE", "resultat",
    ["XA", "TB", "TC", "TD", "TE", "TF", "TG", "TH", "TI"],
    ["RC", "RD", "RE", "RF", "RG", "RH", "RI", "RJ"], true),
  L("RK", "Charges du personnel", "resultat"),
  T("XD", "EXCÉDENT BRUT D'EXPLOITATION", "resultat", ["XC"], ["RK"], true),
  L("TJ", "Reprises d'amortissements et provisions", "resultat"),
  L("RL", "Dotations aux amortissements et provisions", "resultat"),
  T("XE", "RÉSULTAT D'EXPLOITATION", "resultat", ["XD", "TJ"], ["RL"], true),
  L("TK", "Revenus financiers et assimilés", "resultat"),
  L("TL", "Reprises de provisions financières", "resultat"),
  L("TM", "Transferts de charges financières", "resultat"),
  L("RM", "Frais financiers et charges assimilées", "resultat"),
  L("RN", "Dotations aux provisions financières", "resultat"),
  T("XF", "RÉSULTAT FINANCIER", "resultat", ["TK", "TL", "TM"], ["RM", "RN"], true),
  T("XG", "RÉSULTAT DES ACTIVITÉS ORDINAIRES", "resultat", ["XE", "XF"], [], true),
  L("TN", "Produits des cessions d'immobilisations", "resultat"),
  L("TO", "Autres produits HAO", "resultat"),
  L("RO", "Valeurs comptables des cessions d'immobilisations", "resultat"),
  L("RP", "Autres charges HAO", "resultat"),
  T("XH", "RÉSULTAT HORS ACTIVITÉS ORDINAIRES", "resultat", ["TN", "TO"], ["RO", "RP"], true),
  L("RQ", "Participation des travailleurs", "resultat"),
  L("RS", "Impôts sur le résultat", "resultat"),
  T("XI", "RÉSULTAT NET", "resultat", ["XG", "XH"], ["RQ", "RS"], true),
];

export const OHADA_SECTIONS: { key: OhadaSection; title: string; lines: OhadaLine[] }[] = [
  { key: "resultat", title: "Compte de résultat", lines: OHADA_RESULTAT },
  { key: "actif", title: "Bilan — Actif", lines: OHADA_ACTIF },
  { key: "passif", title: "Bilan — Passif", lines: OHADA_PASSIF },
];

export const OHADA_ALL_LINES = [...OHADA_RESULTAT, ...OHADA_ACTIF, ...OHADA_PASSIF];
export const OHADA_INPUT_CODES = new Set(OHADA_ALL_LINES.filter((l) => l.kind === "input").map((l) => l.code));

/** Complète les valeurs saisies par tous les totaux et soldes calculés. */
export function computeOhada(values: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...values };
  const get = (c: string) => out[c] ?? 0;
  // Les lignes sont ordonnées : un total ne dépend que de lignes déjà résolues.
  for (const line of OHADA_ALL_LINES) {
    if (line.kind !== "total") continue;
    const plus = (line.plus ?? []).reduce((a, c) => a + get(c), 0);
    const minus = (line.minus ?? []).reduce((a, c) => a + get(c), 0);
    out[line.code] = plus - minus;
  }
  return out;
}

/** Analyse fonctionnelle dérivée du bilan. */
export function bilanFonctionnel(v: Record<string, number>) {
  const fondsRoulement = (v.DF ?? 0) - (v.AZ ?? 0);            // ressources stables − actif immobilisé
  const bfr = (v.BK ?? 0) - (v.DP ?? 0);                        // actif circulant − passif circulant
  const tresorerieNette = (v.BT ?? 0) - (v.DT ?? 0);            // trésorerie actif − trésorerie passif
  return { fondsRoulement, bfr, tresorerieNette };
}

/** Ratios clés (null si non calculable). */
export function ratios(v: Record<string, number>) {
  const d = (num: number, den: number) => (den ? num / den : null);
  const ca = v.XB ?? 0;
  return {
    margeEbe: d(v.XD ?? 0, ca),                                  // EBE / CA
    margeNette: d(v.XI ?? 0, ca),                                // Résultat net / CA
    roe: d(v.XI ?? 0, v.CP ?? 0),                                // Résultat net / capitaux propres
    autonomie: d(v.CP ?? 0, v.DZ ?? 0),                          // capitaux propres / total bilan
    endettement: d((v.DD ?? 0) + (v.DT ?? 0), v.CP ?? 0),        // dettes financières / capitaux propres
    liquiditeGenerale: d(v.BK ?? 0, v.DP ?? 0),                  // actif circulant / passif circulant
    equilibre: (v.BZ ?? 0) - (v.DZ ?? 0),                        // écart actif − passif (doit être 0)
  };
}
