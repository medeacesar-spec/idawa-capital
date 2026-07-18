// Périodes trimestrielles, au format utilisé partout dans l'application (« 2026-T2 »).
// Volontairement SANS dépendance : ce fichier est importé par des composants clients,
// et tout import indirect du client Supabase serveur casserait la compilation.

/** Trimestre courant. */
export function currentPeriod(d = new Date()): string {
  return `${d.getFullYear()}-T${Math.floor(d.getMonth() / 3) + 1}`;
}

/** Le trimestre qui précède celui passé en argument. */
export function previousPeriod(period: string): string {
  const m = period.match(/^(\d{4})-T([1-4])$/);
  if (!m) return period;
  const [y, q] = [Number(m[1]), Number(m[2])];
  return q === 1 ? `${y - 1}-T4` : `${y}-T${q - 1}`;
}

/** Le trimestre qui suit. */
export function nextPeriod(period: string): string {
  const m = period.match(/^(\d{4})-T([1-4])$/);
  if (!m) return period;
  const [y, q] = [Number(m[1]), Number(m[2])];
  return q === 4 ? `${y + 1}-T1` : `${y}-T${q + 1}`;
}
