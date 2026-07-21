// Règle de composition du mot de passe — partagée entre l'écran « Compte » (changement)
// et l'écran « /reinitialiser » (premier choix via lien d'invitation / réinitialisation).
// Module SANS dépendance serveur : importable depuis un composant client.
//
// NB : Supabase Auth applique aussi sa propre politique (longueur minimale, jeux de
// caractères) réglée dans le tableau de bord Supabase → Authentication → Policies.
// Cette règle côté application doit rester AU MOINS aussi stricte que celle de Supabase,
// sinon un mot de passe accepté ici serait refusé par le serveur.

export const PASSWORD_MIN_LENGTH = 10;

export type PasswordRule = {
  key: string;
  label: string;
  test: (pwd: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { key: "length", label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { key: "lower", label: "Une lettre minuscule (a-z)", test: (p) => /[a-z]/.test(p) },
  { key: "upper", label: "Une lettre majuscule (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { key: "digit", label: "Un chiffre (0-9)", test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "Un caractère spécial (! ? @ # … )", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export type PasswordCheck = {
  valid: boolean;
  results: { key: string; label: string; met: boolean }[];
  // Premier manquement, formulé pour un message d'erreur au moment de la soumission.
  firstError: string | null;
};

export function checkPassword(pwd: string): PasswordCheck {
  const results = PASSWORD_RULES.map((r) => ({ key: r.key, label: r.label, met: r.test(pwd) }));
  const firstUnmet = results.find((r) => !r.met);
  return {
    valid: results.every((r) => r.met),
    results,
    firstError: firstUnmet ? `Le mot de passe doit respecter : ${firstUnmet.label.toLowerCase()}.` : null,
  };
}
