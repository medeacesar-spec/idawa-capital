// Règle de déconnexion pour inactivité, sans dépendance au navigateur (testable seule).

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // déconnexion après 30 min d'inactivité
export const IDLE_WARN_MS = 60 * 1000;          // avertissement 1 min avant

export type IdleDecision = "logout" | "warn" | "ok";

/**
 * last       : dernière activité enregistrée (ms), 0 si aucune.
 * signedInAt : date de la connexion en cours (ms), 0 si inconnue.
 *
 * Une activité antérieure à la connexion en cours ne compte pas : elle appartient à une
 * session précédente (sinon on déconnecterait aussitôt quelqu'un qui vient de se reconnecter).
 */
export function idleDecision(now: number, last: number, signedInAt: number): IdleDecision {
  const ref = Math.max(last, signedInAt);
  if (!ref) return "ok";
  const idle = now - ref;
  if (idle >= IDLE_TIMEOUT_MS) return "logout";
  if (idle >= IDLE_TIMEOUT_MS - IDLE_WARN_MS) return "warn";
  return "ok";
}
