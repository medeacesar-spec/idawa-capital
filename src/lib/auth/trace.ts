// Trace d'accès côté navigateur — sans jamais retarder l'utilisateur.
//
// `keepalive` demande au navigateur de laisser partir la requête même si la page se
// ferme dans la foulée : on peut donc naviguer immédiatement après l'appel, sans
// l'attendre et sans perdre la trace.

export type AuthEventKind = "connexion" | "échec" | "déconnexion" | "expiration" | "mot de passe";

export function traceAuth(kind: AuthEventKind, input: { userId?: string | null; email?: string | null } = {}) {
  try {
    void fetch("/api/auth-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, ...input }),
      keepalive: true,
    }).catch(() => {
      // Journalisation indisponible : sans conséquence sur la connexion.
    });
  } catch {
    // Idem : la trace ne doit jamais faire échouer ce qu'elle observe.
  }
}
