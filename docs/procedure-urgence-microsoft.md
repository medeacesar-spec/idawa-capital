# Procédure d'urgence — accès de l'application à Microsoft 365

À appliquer **sans attendre** si l'on soupçonne que l'accès de l'application ERP à SharePoint est
compromis : certificat ou secret qui a fuité, écriture inexpliquée dans SharePoint, alerte de l'ERP,
ordinateur perdu contenant la clé privée.

## Les trois gestes (dans cet ordre, 5 minutes)

1. **Couper l'identité de l'application** — entra.microsoft.com → Identity → Applications →
   App registrations → application de l'ERP → **Certificates & secrets** : supprimer le certificat
   (onglet Certificates) **et** tout secret restant (onglet Client secrets).
   Effet : plus aucun nouveau jeton ; un jeton déjà émis expire au plus tard dans l'heure.
2. **Retirer l'accès aux sites** — Graph Explorer (compte administrateur) :
   `GET https://graph.microsoft.com/v1.0/sites/{id-du-site}/permissions`, repérer la permission de
   l'application, puis `DELETE https://graph.microsoft.com/v1.0/sites/{id-du-site}/permissions/{id-permission}`.
   Site d'équipe « Idawa Capital » :
   `idawacapitalbenin.sharepoint.com,9c1a5b6d-9fb2-4b78-819a-0ca25698fb5e,72397e26-6a97-4518-a213-ad9374d27357`.
   (Faire de même pour le site « Dépôts » quand il existera.)
3. **Fermer les accès extérieurs de l'ERP** — couper les liens personnels des entrepreneurs et des
   membres de comité (fonction prévue dans la page de dépôt ; d'ici là : séances de comité closes).

## Ensuite

- Noter l'heure, ce qui a été constaté et les gestes faits (journal d'audit de l'ERP + note interne).
- Vérifier dans SharePoint l'historique des versions des fichiers concernés et la corbeille (93 jours).
- Comparer les empreintes des fichiers déposés avec celles enregistrées par l'ERP (quand la phase 3 sera en place).
- Régénérer un certificat, le déposer dans Entra, mettre la nouvelle clé dans Vercel
  (MS_CLIENT_CERT_KEY, MS_CLIENT_CERT_THUMBPRINT), redonner l'accès au site (POST …/permissions, rôle « read »).

## Rotation normale

Le certificat de lecture expire tous les 6 mois (premier : **16 mai 2027**). Un mois avant : générer le
suivant, le déposer dans Entra à côté de l'ancien, mettre à jour Vercel, vérifier, puis supprimer l'ancien.
