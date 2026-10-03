# SharePoint et application Idawa : qui fait quoi

Décision de Médéa (03/10/2026) : **option C — vue en direct**.

## Règle d'or

Une information = un seul endroit de référence ; l'autre outil y renvoie, il ne la recopie pas.

| Information | Référence | L'autre outil |
|---|---|---|
| Fichiers (pièces reçues, data rooms, notes et CR rédigés, modèles financiers) | **SharePoint** | L'application affiche le dossier de l'entreprise **en direct** (onglet Documents) |
| Étape, état, comités et décisions, échéances, chiffres clés, ESG, indicateurs | **Application** | SharePoint garde seulement les pièces justificatives |
| Suivi d'un programme pour un partenaire (ex. tracker CATAL1.5°T) | **Application** | Export depuis l'application ; plus de tableau Excel tenu à la main |
| Réunion courante | **Note au Suivi de l'application** | Pas de Word |
| Réunion formelle (COD, CI, note d'évaluation) | **Word dans SharePoint** | Décision et validation saisies dans l'application |
| Prochaines étapes | **Tâches de l'application** (avec échéance) | Plus de tableau « Prochaines étapes » dans les CR |
| RH, Politiques, Finances, Communication, mandats de Conseil sans entreprise | **SharePoint seulement** | — |

## Fonctionnement de la vue en direct

- Chaque fiche (dossier du pipeline ou participation) est rattachée à **son dossier SharePoint** par l'identifiant du dossier : un renommage ou un déplacement ne casse rien.
- L'onglet Documents lit ce dossier à l'ouverture, rangé comme dans SharePoint (sous-dossiers d'abord, ordre naturel). Rien n'est copié dans la base.
- Rattacher un dossier : onglet Documents → « Rattacher » → coller le lien du dossier (barre d'adresse ou « Copier le lien »).
- L'application ne montre jamais un élément situé hors du dossier rattaché.

## Activation (une fois, par un administrateur Microsoft 365)

1. **entra.microsoft.com** → *Applications* → *App registrations* → **New registration**.
   - Name : `Idawa ERP – SharePoint` ; *Supported account types* : **Accounts in this organizational directory only** ; pas de *Redirect URI* → **Register**.
2. Sur la page de l'application, noter **Application (client) ID** et **Directory (tenant) ID**.
3. *Certificates & secrets* → *Client secrets* → **New client secret** → description `Vercel`, expiration **24 months** → **Add** → copier immédiatement la colonne **Value** (elle ne s'affiche qu'une fois).
4. *API permissions* → **Add a permission** → *Microsoft Graph* → **Application permissions** → cocher **Sites.Read.All** → *Add permissions* → **Grant admin consent for Idawa Capital** → *Yes*.
5. **vercel.com** → projet `idawa-capital` → *Settings* → *Environment Variables* → ajouter, pour *Production* et *Preview* :
   - `MS_TENANT_ID` = Directory (tenant) ID
   - `MS_CLIENT_ID` = Application (client) ID
   - `MS_CLIENT_SECRET` = Value du secret
6. *Deployments* → dernier déploiement → **⋯** → **Redeploy**.

À noter : le secret expire après 24 mois — prévoir son renouvellement (étapes 3, 5, 6). L'autorisation « Sites.Read.All » permet à l'application de lire les sites SharePoint de l'organisation ; l'application n'affiche que les dossiers rattachés aux fiches, et l'ouverture d'un fichier reste soumise aux droits SharePoint de chaque personne.
