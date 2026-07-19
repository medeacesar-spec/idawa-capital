"use server";

// Enregistrement des événements d'accès.
//
// Écrit CÔTÉ SERVEUR, et non depuis le navigateur, pour deux raisons : l'adresse IP n'est
// lisible que dans les en-têtes de la requête, et un échec de connexion doit pouvoir être
// consigné alors qu'aucune session n'existe encore.
//
// Un échec de connexion n'a pas d'utilisateur identifié — l'email saisi peut ne
// correspondre à aucun compte. On conserve donc l'email tenté, jamais le mot de passe.

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthEventKind = "connexion" | "échec" | "déconnexion" | "expiration" | "mot de passe";

export async function recordAuthEvent(kind: AuthEventKind, input: { userId?: string | null; email?: string | null } = {}) {
  try {
    const h = await headers();
    // Derrière un proxy, l'adresse d'origine est la première de la liste.
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
    const userAgent = h.get("user-agent")?.slice(0, 200) ?? null;

    // Le service d'administration : l'écriture doit aboutir même sans session ouverte,
    // ce qui est précisément le cas d'un échec de connexion.
    await createAdminClient().from("auth_events").insert({
      kind,
      user_id: input.userId ?? null,
      email: input.email ?? null,
      ip,
      user_agent: userAgent,
    });
  } catch {
    // Une trace manquante ne doit jamais empêcher de se connecter ou de se déconnecter.
  }
}
