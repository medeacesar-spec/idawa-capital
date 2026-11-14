// Distinguer « service injoignable » de « identifiants refusés ».
//
// Quand le serveur d'authentification ne répond pas (projet Supabase en pause, coupure
// réseau, panne), supabase-js ne lève pas d'exception : il renvoie une erreur
// « AuthRetryableFetchError », sans statut HTTP ou avec un statut 5xx. Sans ce tri, la page
// de connexion annonçait « Email ou mot de passe incorrect » à tout le monde (14/11/2026).

export const SERVICE_UNAVAILABLE =
  "Le service est momentanément indisponible : votre mot de passe n'est pas en cause. Réessayez dans quelques minutes ; si le problème persiste, prévenez l'administrateur.";

export function isServiceUnavailable(error: { name?: string; status?: number } | null | undefined): boolean {
  if (!error) return false;
  if (error.name === "AuthRetryableFetchError") return true;
  return !error.status || error.status >= 500;
}

/** Message d'échec d'une opération sur le mot de passe (changement, réinitialisation). */
export function authFailure(error: { name?: string; status?: number; message?: string }): string {
  return isServiceUnavailable(error) ? SERVICE_UNAVAILABLE : `Échec : ${error.message ?? "erreur inconnue"}`;
}
