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

export const ACTIVITY_KEY = "idawa:lastActivity"; // partagé entre onglets

/**
 * Heure d'ouverture de la session (ms), lue dans le jeton d'accès : la revendication `amr`
 * date chaque authentification (mot de passe, lien d'invitation…) et garde cette date quand
 * le jeton est renouvelé. 0 si illisible.
 *
 * Ne pas se fier à `user.last_sign_in_at` : constaté le 03/10/2026, il peut rester figé sur
 * une connexion ancienne (26/09) alors qu'une nouvelle vient d'aboutir — on déconnectait
 * aussitôt la personne qui venait de se reconnecter.
 */
export function sessionStartFromToken(accessToken: string | null | undefined): number {
  try {
    const part = accessToken?.split(".")[1];
    if (!part) return 0;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const claims = JSON.parse(atob(b64)) as { amr?: { timestamp?: number }[] };
    const ts = (claims.amr ?? []).map((a) => Number(a.timestamp) || 0);
    return ts.length ? Math.max(...ts) * 1000 : 0;
  } catch {
    return 0;
  }
}

// Même information dans un cookie, pour que le SERVEUR la voie à chaque page demandée :
// une session restée ouverte dans un onglet oublié ou un ordinateur en veille est fermée
// avant même que la page s'affiche, sans dépendre du minuteur de la page.
export const ACTIVITY_COOKIE = "idawa_activity";

// Marge côté serveur : l'heure de l'ordinateur et celle du serveur peuvent différer un peu.
export const SERVER_GRACE_MS = 2 * 60 * 1000;

/** Contrôle du serveur : vrai si la session a dépassé 30 min sans activité. */
export function serverIdleExpired(now: number, last: number, sessionStart: number): boolean {
  const ref = Math.max(last, sessionStart);
  return ref > 0 && now - ref > IDLE_TIMEOUT_MS + SERVER_GRACE_MS;
}

/** Dernière activité lue dans le cookie (navigateur). */
export function readActivityCookie(): number {
  try {
    const m = document.cookie.match(new RegExp("(?:^|; )" + ACTIVITY_COOKIE + "=(\\d+)"));
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}

/** Enregistre une activité : stockage local (partagé entre onglets) + cookie (lu par le serveur). */
export function recordActivity(t = Date.now()) {
  try { localStorage.setItem(ACTIVITY_KEY, String(t)); } catch {}
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ACTIVITY_COOKIE}=${t}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;
  } catch {}
}

/** À appeler dès qu'une session s'ouvre : le décompte des 30 minutes part de là. */
export function markSessionStart(now = Date.now()) {
  recordActivity(now);
}
