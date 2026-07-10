# Plan de construction — Application Idawa Capital

## Stack (validée)
- **Front** : Next.js 16 (React 19, App Router) + Tailwind — recréé fidèlement d'après le design Claude Design.
- **Polices** : Playfair Display (serif) + Libre Franklin (sans), via next/font.
- **Base de données + Auth** : Supabase (Postgres + authentification + stockage fichiers).
- **Hébergement** : Vercel (connecté à votre GitHub) — gratuit.

## Qui fait quoi
- **MOI** (via les outils) : tout le code, le schéma de base, les écrans, les vérifications locales.
- **VOUS** (avec mon guidage pas à pas) : créer les comptes Supabase et Vercel, coller le SQL que je génère dans Supabase, cliquer pour déployer. Aucune ligne de code de votre part.

---

## Phase 0 — Comptes & accès (VOUS, ~30 min, guidé)
1. Créer un compte **Supabase** (gratuit) et un projet.
2. Me communiquer 2 clés (URL du projet + clé « anon ») → je les mets dans la config locale.
3. Compte **Vercel** (gratuit, connexion via GitHub) — pour plus tard (Phase 7).
> On peut démarrer la Phase 1 en parallèle, sans attendre.

## Phase 1 — Fondations (MOI)
- Nettoyer le squelette Next.js ; intégrer les polices et les **tokens de la charte** (couleurs, rayons, ombres).
- Importer les **vrais logos** (`assets/`) dans le projet.
- Construire la **coquille d'app** : sidebar 238px (Pilotage / Relation / Administration), header (titre, recherche, « Saisir un reporting »), routage des pages.
- Composants de base réutilisables : cartes, badges, chips, boutons, tuiles d'indicateurs, tableaux, graphiques SVG.
- **Livrable visible** : l'app tourne en local, on navigue dans la coquille (données d'exemple).

## Phase 2 — Base de données & sécurité (MOI + VOUS pour exécuter le SQL)
- Schéma Supabase complet :
  - `funds`, `programs` (avec **nature : invest / accompagnement / mixte**), `program_memberships` (historique daté).
  - `deals` (pipeline) + `committees` (passages, multi-passages) ; `portfolio_companies`.
  - `industries` / `sub_sectors` / `kpi_library` ; `kpis` (valeurs temporelles vs cible).
  - `esg_framework` + `esg_screening` + `esg_action_plan` (I&P / IFC PS1–PS8, rating d'impact).
  - `contacts`, `documents`, `partners` (typés), `time_tracking`.
  - `profiles`, `roles` (8 presets configurables), `permissions`, portée par programme.
- **Sécurité (RLS)** : les 3 niveaux (données par boîte / vues consolidées = Direction / modification config = Admin) + portée par programme.
- **Seed** : bibliothèque de 905 KPIs, cadre ESG, taxonomie des 13 industries, programmes de départ.
- **Auth** : écran de connexion + gestion des utilisateurs.
- **Livrable visible** : connexion réelle, données persistées.

## Phase 3 — Écrans de pilotage (MOI)
- **Tableau de bord** avec sélecteur de **périmètre** + adaptation selon la **nature de programme** (financier vs accompagnement).
- **Pipeline** (filtre par programme) → **Fiche deal** (onglets : Présentation, Suivi, Due diligence, **Comités**, KPIs, Création de valeur, **ESG**, Documents, Contacts, Suivi du temps).
- **Portefeuille** → **Fiche société** (KPIs dans le temps vs objectif, Budget, Création de valeur, ESG, Flux & Valorisation, Cap table).
- **Performance** (TVPI/DPI/TRI, pont de création de valeur) — masqué pour les programmes d'accompagnement.

## Phase 4 — ESG & Reporting (MOI)
- **Module ESG & Impact** : screening (exclusion, secteur EHS, risques PS1–PS8), rating d'impact IPDEV 2, plan d'actions & monitoring semestriel — grilles adaptées invest/accompagnement.
- **Saisie du reporting** (société + période, cible/précédent pré-remplis, écart en direct, import Excel).
- **Reporting & extraction** (par périmètre + période ; exports Excel/PDF/CSV ; complétude par société).

## Phase 5 — Relation & Administration (MOI)
- **Contacts** (répertoire structuré par organisation + fonctions).
- **Documents** (upload et rangement — stockage Supabase).
- **Partenaires & LPs** (typés, engagé vs en discussion — accès Direction).
- **Bibliothèque KPIs** (édition en Admin).
- **Paramètres du fonds** (nature de chaque programme).
- **Administration** : utilisateurs, rôles configurables, portée par programme.

## Phase 6 — Finitions (MOI)
- **Responsive mobile** (sidebar en tiroir, tableaux → cartes).
- Recherche globale, notifications d'échéances de reporting.
- États de chargement / vides / erreurs, validations de saisie, accessibilité.

## Phase 7 — Mise en ligne (VOUS + MOI, guidé)
1. Envoi du code sur **GitHub**.
2. **Déploiement Vercel** (connexion au dépôt + variables d'environnement Supabase).
3. Tests en ligne, création des comptes de votre équipe.

---

## Principe de travail
- On avance **par étapes** ; à chaque écran je **vérifie qu'il tourne** avant de continuer, et je vous montre le résultat.
- Vous pouvez réorienter à tout moment (priorité à tel écran, ajustement d'un champ).

## Pour démarrer tout de suite
Je peux **lancer la Phase 1** immédiatement (fondations + coquille + premiers écrans en local avec données d'exemple), pendant que **vous créez le compte Supabase** en parallèle (Phase 0). Dès que j'ai vos 2 clés, je branche la vraie base.
