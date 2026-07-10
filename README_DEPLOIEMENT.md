# Mettre Idawa Capital en ligne — guide pas à pas

L'application est **prête à déployer**. Voici comment la publier sur Internet avec **Vercel** (gratuit), connecté à votre **GitHub**. ~15 minutes. On peut le faire ensemble.

## Ce qu'il faut
- Un compte **GitHub** (vous en avez un).
- Un compte **Vercel** (gratuit, connexion via GitHub) : https://vercel.com

---

## Étape 1 — Envoyer le code sur GitHub
Le dépôt Git est déjà initialisé et un premier commit est fait. Il reste à le pousser sur GitHub :

1. Sur **github.com**, créez un nouveau dépôt **privé** nommé `idawa-capital` (sans README, sans .gitignore — le projet en a déjà).
2. GitHub affiche des commandes « …or push an existing repository ». Copiez les 2 lignes `git remote add origin …` et `git push -u origin main`. (Je peux les exécuter pour vous.)

## Étape 2 — Importer dans Vercel
1. Sur **vercel.com** → **Add New… → Project**.
2. **Import** le dépôt `idawa-capital` depuis GitHub.
3. Vercel détecte automatiquement Next.js. Ne changez rien dans « Build settings ».

## Étape 3 — Renseigner les variables d'environnement (IMPORTANT)
Avant de cliquer « Deploy », dépliez **Environment Variables** et ajoutez ces 3 lignes
(valeurs dans votre `.env.local`, ou dans Supabase → Settings → API) :

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rcwexonahkbrilwhhtqw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | votre clé publishable (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | votre clé secrète (`sb_secret_…`) — pour la gestion des utilisateurs |

## Étape 4 — Déployer
Cliquez **Deploy**. Après ~2 minutes, Vercel vous donne une **URL publique** (ex. `idawa-capital.vercel.app`).

## Étape 5 — Autoriser l'URL dans Supabase
Pour que la connexion fonctionne en ligne :
1. Supabase → **Authentication** → **URL Configuration**.
2. Ajoutez votre URL Vercel dans **Site URL** et **Redirect URLs**.

---

## Après la mise en ligne
- Créez les comptes de votre équipe (Authentication → Users, ou via la future page Admin).
- **Sécurité** : vous pouvez régénérer le mot de passe de la base et les clés à tout moment (mettez alors à jour les variables dans Vercel).
- Chaque fois que le code est mis à jour sur GitHub, Vercel redéploie automatiquement.

## Notes techniques
- Stack : Next.js 16 (App Router) + Supabase (Postgres + Auth) + Vercel.
- Base de données : 26+ tables, sécurité RLS activée.
- Le fichier `.env.local` (secrets) n'est **pas** envoyé sur GitHub (protégé par `.gitignore`).
