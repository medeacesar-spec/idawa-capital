"use client";

// Droit d'écriture partagé par toute une fiche.
//
// Les onglets d'une fiche société ou dossier sont nombreux et imbriqués : faire descendre
// un booléen de proche en proche à travers chacun serait verbeux et facile à oublier.
// Un contexte le met à disposition de n'importe quel onglet, et les composants ci-dessous
// évitent d'avoir à réécrire la même condition partout.
//
// ATTENTION : ceci masque l'interface, ce n'est pas une barrière de sécurité. Tant que les
// politiques RLS de Postgres restent ouvertes à tout utilisateur authentifié, quelqu'un qui
// contourne l'interface peut toujours écrire. Le verrouillage en base reste à faire.

import { createContext, useContext } from "react";

const WriteAccessCtx = createContext(true);

export function WriteAccessProvider({ canEdit, children }: { canEdit: boolean; children: React.ReactNode }) {
  return <WriteAccessCtx.Provider value={canEdit}>{children}</WriteAccessCtx.Provider>;
}

export function useCanEdit(): boolean {
  return useContext(WriteAccessCtx);
}

/** N'affiche ses enfants qu'aux utilisateurs autorisés à écrire. */
export function CanEdit({ children }: { children: React.ReactNode }) {
  return useCanEdit() ? <>{children}</> : null;
}

/** Bandeau expliquant pourquoi les actions d'écriture sont absentes. */
export function ReadOnlyNotice({ what = "cette fiche" }: { what?: string }) {
  if (useCanEdit()) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-cream)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 13px", marginBottom: 14, fontSize: 11.5, color: "var(--text-2)" }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--camel)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      Vous consultez {what} en <b>lecture seule</b> : votre rôle ne permet pas de modifier ces données.
    </div>
  );
}
