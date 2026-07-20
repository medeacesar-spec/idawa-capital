// Questionnaire d'impact annuel I&P / IPDEV — structure fidèle au tableur
// « 02. ESG & Impact_Questionnaire impact ». Rempli par L'ENTREPRENEUR via un lien web ;
// Idawa relit, valide et analyse. Le formulaire (public et interne) se rend depuis cette spec.
//
// Types de champ :
//  · hf    → couple Hommes / Femmes (total = H + F, calculé)
//  · num   → nombre entier
//  · pct   → pourcentage
//  · money → montant (FCFA)
//  · bool  → Oui / Non
//  · bool3 → Oui / Non / En cours
//  · text  → texte libre

export type QFieldKind = "hf" | "num" | "pct" | "money" | "bool" | "bool3" | "text";
export type QField = { key: string; label: string; kind: QFieldKind; help?: string };
export type QGroup = { key: string; title?: string; fields: QField[] };
export type QSection = { key: string; roman: string; title: string; groups: QGroup[] };

// Un jeu de sous-champs répété pour chaque catégorie d'emploi (tous en H/F).
const empFields = (prefix: string, opts?: { presta?: boolean; basRevenus?: boolean }): QField[] => {
  const f: QField[] = [{ key: `${prefix}_total`, label: "Total", kind: "hf" }];
  if (opts?.presta) {
    f.push({ key: `${prefix}_formels`, label: "Formalisés (revenus déclarés / retenue à la source, ou n° d'enregistrement)", kind: "hf" });
    f.push({ key: `${prefix}_contrat`, label: "Avec un contrat de prestation signé", kind: "hf" });
  } else {
    f.push({ key: `${prefix}_formels2`, label: "Formalisés aux 2 caisses (sécurité sociale ET maladie)", kind: "hf" });
    f.push({ key: `${prefix}_formels1`, label: "Formalisés à 1 caisse (sécurité sociale ou maladie)", kind: "hf" });
  }
  f.push({ key: `${prefix}_declares`, label: "Déclarés au cours de l'année", kind: "hf" });
  f.push({ key: `${prefix}_jeunes1`, label: "Jeunes 14–24 ans", kind: "hf" });
  f.push({ key: `${prefix}_jeunes2`, label: "Jeunes 25–34 ans", kind: "hf" });
  if (opts?.basRevenus) {
    f.push({ key: `${prefix}_bas`, label: "Emplois à bas revenus (< 160 000 FCFA/mois)", kind: "hf", help: "Rémunération inférieure à 5 300 FCFA/jour ou 160 000 FCFA/mois." });
    f.push({ key: `${prefix}_bas_jeunes`, label: "dont jeunes à bas revenus (14–24 ans)", kind: "hf" });
  }
  return f;
};

export const IMPACT_SECTIONS: QSection[] = [
  {
    key: "employes", roman: "I", title: "Employés",
    groups: [
      { key: "cadre", title: "Cadre du reporting", fields: [
        { key: "devise", label: "Monnaie locale du reporting", kind: "text" },
        { key: "taux_change", label: "Taux de change euro / monnaie locale", kind: "num", help: "Ex. 1 € = 655,957 FCFA." },
        { key: "effectif_jan", label: "Nombre total d'employés permanents au 1ᵉʳ janvier", kind: "num", help: "Permanents uniquement, déclarés et non déclarés, hors stagiaires/journaliers/prestataires." },
        { key: "effectif_dec", label: "Nombre total d'employés permanents au 31 décembre", kind: "num" },
      ] },
      { key: "permanents", title: "Répartition — Permanents", fields: empFields("perm", { basRevenus: true }) },
      { key: "stagiaires", title: "Répartition — Stagiaires", fields: empFields("stag") },
      { key: "journaliers", title: "Répartition — Journaliers / Saisonniers / Vacataires", fields: empFields("jsv") },
      { key: "prestataires", title: "Répartition — Prestataires", fields: empFields("prest", { presta: true }) },
      { key: "autres", title: "Répartition — Autres temporaires", fields: empFields("autre") },
      { key: "contrat", title: "Contrat de travail", fields: [
        { key: "contrat_avant", label: "Employés avec contrat signé, avant notre financement", kind: "num" },
        { key: "contrat_avant_perm", label: "dont permanents", kind: "num" },
        { key: "contrat_dec", label: "Employés avec contrat signé, au 31.12", kind: "num" },
        { key: "contrat_dec_perm", label: "dont permanents", kind: "num" },
      ] },
      { key: "turnover", title: "Turnover", fields: [
        { key: "turnover", label: "Permanents (déclarés et non déclarés) ayant quitté l'entreprise durant l'exercice", kind: "num" },
      ] },
      { key: "qualification", title: "Qualification (parmi les permanents)", fields: [
        { key: "qual_tres", label: "% d'employés très qualifiés", kind: "pct" },
        { key: "qual_tres_femmes", label: "dont % de femmes parmi les très qualifiés", kind: "pct" },
        { key: "qual_moyen", label: "% d'employés moyennement qualifiés", kind: "pct" },
        { key: "qual_faible", label: "% d'employés faiblement qualifiés", kind: "pct" },
      ] },
      { key: "formation", title: "Formation", fields: [
        { key: "formation_politique", label: "Politique de formation pour les salariés ?", kind: "bool3" },
        { key: "formation_nb", label: "Si oui, nombre d'employés formés durant l'année", kind: "num" },
      ] },
      { key: "salaire", title: "Salaires", fields: [
        { key: "masse_salariale", label: "Masse salariale annuelle brute", kind: "money" },
        { key: "salaire_min_pays", label: "Salaire net minimum en vigueur dans le pays", kind: "money" },
        { key: "salaire_min_entreprise", label: "Salaire net minimum d'un permanent dans l'entreprise", kind: "money" },
        { key: "salaire_moyen", label: "Salaire net moyen des employés déclarés", kind: "money" },
      ] },
      { key: "secu", title: "Sécurité sociale", fields: [
        { key: "secu_declares", label: "Employés déclarés à la caisse de sécurité sociale", kind: "num" },
        { key: "secu_declares_perm", label: "dont permanents", kind: "num" },
        { key: "secu_declares_temp", label: "dont temporaires", kind: "num" },
        { key: "assurance", label: "Assurance / mutuelle santé privée ?", kind: "bool" },
        { key: "assurance_nb", label: "Si oui, nombre d'employés couverts", kind: "num" },
      ] },
      { key: "accident", title: "Accidents", fields: [
        { key: "accident", label: "Accident du travail au cours de l'année ?", kind: "bool" },
      ] },
    ],
  },
  {
    key: "clients", roman: "II", title: "Clients / Fournisseurs",
    groups: [{ key: "fournisseurs", fields: [
      { key: "fourn_nb", label: "Nombre de fournisseurs (hors petits producteurs)", kind: "num" },
      { key: "fourn_nationaux", label: "Part de fournisseurs nationaux", kind: "pct" },
    ] }],
  },
  {
    key: "etat", roman: "III", title: "État",
    groups: [
      { key: "ventes", title: "Ventes", fields: [
        { key: "ca", label: "Chiffre d'affaires de l'exercice", kind: "money" },
        { key: "export", label: "% des ventes à l'export", kind: "pct" },
        { key: "valeur_ajoutee", label: "Valeur ajoutée (CA − consommations intermédiaires)", kind: "money" },
      ] },
      { key: "taxes", title: "Taxes / cotisations", fields: [
        { key: "contribution_etat", label: "Contribution aux revenus de l'État durant l'année", kind: "money" },
        { key: "impot_resultat", label: "Impôt sur le résultat payé", kind: "money" },
        { key: "tva", label: "TVA payée (collectée − déductible)", kind: "money" },
        { key: "charges_patronales", label: "Charges patronales payées", kind: "money" },
        { key: "autres_impots", label: "Autres impôts et taxes payés", kind: "money" },
        { key: "a_jour", label: "À jour de toutes les taxes et impôts ?", kind: "bool3" },
      ] },
    ],
  },
  {
    key: "investisseurs", roman: "IV", title: "Investisseurs / Tiers",
    groups: [{ key: "fonds", title: "Fonds levés auprès de tiers durant l'année (hors notre financement)", fields: [
      { key: "fonds_capital", label: "En capital / equity", kind: "money" },
      { key: "fonds_dette", label: "En dette", kind: "money" },
      { key: "fonds_subvention", label: "En subvention", kind: "money" },
    ] }],
  },
  {
    key: "gouvernance", roman: "V", title: "Gouvernance",
    groups: [{ key: "ca", title: "Conseil d'administration / comité stratégique", fields: [
      { key: "ca_reunions", label: "Nombre de réunions cette année", kind: "num" },
      { key: "ca_membres", label: "Nombre de membres", kind: "num" },
      { key: "ca_femmes", label: "Nombre de femmes", kind: "num" },
      { key: "ca_independants", label: "Nombre de membres indépendants", kind: "num" },
    ] }],
  },
  {
    key: "environnement", roman: "VI", title: "Environnement",
    groups: [{ key: "env", fields: [
      { key: "energies", label: "Recours à des énergies renouvelables (solaire, éolien, biomasse, micro-hydraulique) ?", kind: "bool" },
      { key: "energies_part", label: "Si oui, part dans la consommation énergétique totale", kind: "pct" },
      { key: "dechets", label: "Processus de traitement / revalorisation des déchets ?", kind: "bool" },
      { key: "dechets_part", label: "Si oui, part des déchets recyclés", kind: "pct" },
      { key: "initiative", label: "Initiative environnementale mise en place ?", kind: "bool" },
      { key: "projet", label: "Projet environnemental prévu à l'avenir ?", kind: "bool" },
    ] }],
  },
  {
    key: "certification", roman: "VII", title: "Certification & indicateurs spécifiques",
    groups: [
      { key: "cert", title: "Certification", fields: [
        { key: "certif", label: "Certification internationale obtenue cette année (HACCP, ISO 9001/14001…) ?", kind: "bool3" },
        { key: "certif_nb", label: "Si oui, combien ?", kind: "num" },
        { key: "certif_types", label: "Types de certification", kind: "text" },
      ] },
      { key: "specifiques", title: "Indicateurs spécifiques", fields: [
        { key: "specifiques", label: "Tout autre indicateur pertinent sur l'activité", kind: "text" },
      ] },
    ],
  },
];

// Réponse : { [fieldKey]: number | string | {h,f} }, + commentaires par section.
export type HF = { h: number | null; f: number | null };
export type QData = Record<string, unknown> & { comments?: Record<string, string> };

export function hfOf(data: QData, key: string): HF {
  const v = data[key] as HF | undefined;
  return { h: v?.h ?? null, f: v?.f ?? null };
}
export function hfTotal(v: HF): number | null {
  if (v.h == null && v.f == null) return null;
  return (v.h ?? 0) + (v.f ?? 0);
}

// Total des emplois (permanents + temporaires) = somme des « total » H+F de chaque catégorie.
export const EMP_CATEGORIES = ["perm", "stag", "jsv", "prest", "autre"];
export function totalEmplois(data: QData): number {
  return EMP_CATEGORIES.reduce((s, c) => s + (hfTotal(hfOf(data, `${c}_total`)) ?? 0), 0);
}

export const Q_STATUS = ["Brouillon", "Envoyé", "Reçu", "Validé"] as const;
export type QStatus = (typeof Q_STATUS)[number];
