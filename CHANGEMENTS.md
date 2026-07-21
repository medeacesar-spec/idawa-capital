# Plan de déploiement — Idawa Capital

**Objectif-nord** : coller au système opérationnel **I&P / IPDEV** et sortir les rapports **en un clic** aux formats des modèles partagés (fiche entreprise trimestrielle, rapport ESG & Impact annuel).

> **Règle de gestion des demandes** : toute nouvelle demande est **rattachée à la phase qui lui correspond**. Si elle n'entre dans aucune des phases existantes, on **ouvre une phase suivante** (Phase 5, 6…). On ne tient pas de liste à plat en parallèle.

**Statuts** : `à faire` · `en cours` · `à tester` · `fait`

---

## Phase 0 — Quick wins ✅ *terminée*

| Item | Statut |
|---|---|
| Terminologie « valeur » → « valorisation » | fait |
| Documents triés (Récents / A→Z) + dates, à chaque niveau | fait |
| Source d'entrée du dossier (+ précision/nom) | fait |
| Valo pré-money & date de closing masquées (champs avancés) | fait |
| Une date sur chaque événement (tâches, DD, création de valeur, ESG) | fait |
| **Correction** — Documents : le tri alphabétique doit porter sur le **nom de l'entreprise** (et non le titre du document) | à tester |

---

## Phase 1 — Socle : instruments & données financières

| Item | Statut | Migration |
|---|---|---|
| **1a** — Modèle instruments (capital / quasi-equity / prêt de campagne) + onglet Investissement | fait | 0012 |
| **1b-1** — Échéancier d'amortissement calculé (différé, annuités, taux plafonné) | fait | non |
| **Budget & BP** — grille OHADA en colonnes d'années, saisie directe, postes modifiables | fait | non |
| **Résumé Investissement** séparé par les 3 types d'instruments | fait | non |
| **1b-2** — Suivi des créances réelles : facturation, encaissements, arriérés vs prévisionnel | fait | 0014 |
| **1c** — Réorganisation fiche société en 4 familles : Investissement / Valorisation / Performance / Suivi & gouvernance, navigation à deux niveaux | à tester | non |
| **1d** — Moteur OHADA : saisie **complète** des états financiers → totaux, SIG, bilan fonctionnel, ratios | fait | 0016 |
| **Analyse financière au format du modèle déposé** (Saint-André) : soldes de gestion avec **poids dans le CA et variation d'un exercice à l'autre**, bilan fonctionnel complet, **CAF**, et bibliothèque de **15 ratios en 6 familles** — chacun avec sa formule, sa **norme** et une lecture conforme / à surveiller. Ratios bancaires (BCEAO) et assurantiels (UEMOA) **listés mais non calculés** : le plan OHADA général ne porte pas leurs postes. Sortie aussi en extraction. | à tester | non |
| **1d-bis** — Import d'états financiers **sans frais** : analyseur qui s'accroche aux **codes OHADA** imprimés + écran de vérification. Entrées : ① copier-coller ② Excel/CSV ③ PDF numérique (pdf.js) ④ image/scan (Tesseract.js, bonus). **Aucune clé API, aucun coût.** | ① copier-coller **à tester** · ②③④ à faire | non |
| **Correction 1d** — Navigation des exercices : plus **récents en premier**, ajout d'une année **antérieure ET postérieure**, retrait d'une colonne, **fenêtre glissante de 3 exercices avec flèches** (aucune année perdue) — même principe sur **Budget & BP** | à tester | non |
| **Correction 1b-2** — Vue dédiée des **remboursements par prêt** : engagements, historique des paiements, restant dû → nouvel onglet **Remboursements** sur la fiche société | à tester | non |

---

## Phase 2 bis — Accélération : des écrans qui lui correspondent

Le portefeuille avait été pensé pour les participations. Une entreprise accélérée y voyait
des instruments de financement, une valorisation et une cap table sans objet.

| Item | Statut | Migration |
|---|---|---|
| Fiche adaptée au type de suivi : les familles dépendent de ce qui s'applique, pas d'une case cochée | à tester | non |
| Suivi de l'accompagnement **par entreprise**, agrégé au programme (jours d'appui, formations, emplois) | à tester | 0024 |
| Portée des indicateurs : « entreprise » (additionnable) ou « programme » (budget, pourcentages) | à tester | 0024 |
| Décisions de comité propres à l'accélération : admission, prolongation, sortie, exclusion | à tester | 0025 |
| Classification E&S déplacée de Structuration vers ESG : elle vaut pour tous les types | à tester | non |
| Saisie des indicateurs au niveau programme (budget, taux d'exécution, pourcentages) | à tester | non |
| **Consolidation de l'accélération** sur la page Performance : six indicateurs de tête par programme suivant la chaîne de résultats, le reste à la demande | à tester | non |
| Agrégation des valeurs entreprise dans le tableau de bord du programme | à tester | non |

---

## Phase 2 — Performance & structuration

| Item | Statut | Migration |
|---|---|---|
| Performance : CA / EBE / taux d'EBE vs N-1 **et** vs budget (▲▼▬), tableau de toutes les participations | fait | non |
| Structuration & sortie : piste de sortie (put option, formule, cession tiers), méthode de valo, multiple & TRI attendus | fait | 0015 |
| **Correction** — **Plusieurs méthodes de valorisation** et **plusieurs pistes de sortie** possibles (choix multiples) | fait | 0018 |
| Décisions portefeuille étendues : réinvestissement, sortie partielle, sortie complète, radiation, dépréciation, restructuration, conversion, distribution, mise sous surveillance | à tester | 0020 |
| Séparation valorisation / performance : onglet **Valorisation** dédié, cadence annuelle, arrêté par le comité d'audit, un seul arrêté par exercice | à tester | 0022-0023 |
| **Échéancier consolidé au niveau du fonds** : arriérés et échéances à venir toutes sociétés confondues, profil mensuel des encaissements (page Performance) | à tester | non |
| **KPIs financiers sortis de RH & Management** (8 indicateurs sectoriels replacés en Financier) | fait | 0019 |
| **KPIs alignés sur la norme OHADA** : 16 indicateurs normalisés avec leur code de poste, ajoutables en un clic, tous alimentés automatiquement | à tester | non |
| **KPIs financiers alimentés automatiquement** depuis les états financiers **et la grille Budget & BP** (valeurs + cibles), bouton « Alimenter » sur l'onglet KPIs — double saisie supprimée | à tester | non |
| **Une société ET un dossier peuvent appartenir à plusieurs programmes** simultanément, avec un programme principal pour les totaux et un historique daté des rattachements | à tester | 0026, 0029 |

---

## Socle transverse — sécurité, traçabilité, cohérence

Chantiers non prévus au plan initial, ouverts au fil des retours d'usage.

| Item | Statut | Migration |
|---|---|---|
| Actions d'écriture masquées selon le rôle + contrôle automatique `audit_write_access.mjs` | à tester | non |
| Domaines de permission **Contacts** et **Documents** | à tester | 0021 |
| Cohérence entreprise ↔ programme (une participation relève d'un programme qui investit) | à tester | non |
| **Journal d'audit : détail des champs modifiés (avant → après) + filtres** | à tester | 0030 |
| **Suivi des connexions** : historique par personne sur 30 jours, dernière venue, comptes dormants | à tester | 0031 |
| **Employés connectés à l'instant** (session active vue dans les 20 dernières minutes) | à tester | 0031 |
| Rapprocher connexions et modifications par personne (qui vient, qui agit) | à tester | non |
| Journal d'accès élargi : connexions, **échecs**, déconnexions, expirations, appareil et adresse | à tester | 0032 |
| Alerte sur tentatives répétées d'accès à un même compte | à tester | non |
| Journal en trois onglets : activité, modifications, accès & sécurité | à tester | non |
| Alerte sur compte dormant ou accès jamais utilisé | à faire | non |
| Emails aux personnes assignées à une action | à tester | non |
| **Correction — connexion figée sur « Connexion… »** : `router.push` après l'ouverture de session traversait le middleware avant que les cookies soient visibles, qui renvoyait alors sur /login. Navigation par rechargement complet, trace d'accès non bloquante (2,5 s max), et sortie d'erreur au bout de 8 s. Même correction sur la définition du mot de passe (parcours de tout nouvel invité) et sur la déconnexion. | à tester | non |
| Verrouillage RLS par rôle en base | à faire | oui |

---

## Phase 3 — Pipeline avancé

| Item | Statut | Migration |
|---|---|---|
| Stade « pipeline avancé » entre Analyse et Due diligence | à tester | 0027 |
| « Prochaine étape » en tête de dossier — **déduite** de la tâche ouverte la plus proche, sans champ dédié | à tester | non |
| « Post-mortem » sur les dossiers écartés | à tester | 0027 |
| ESG & Création de valeur masqués tant que le dossier n'est pas au stade avancé | à tester | non |
| Analyses par source d'entrée : volume, montant, aboutis, écartés, taux d'aboutissement | à tester | non |
| **Outil d'import du pipeline** — dépôt d'un fichier Excel/CSV ou copier-coller, détection de la feuille et de la ligne d'en-tête, correspondance colonne → champ proposée puis modifiable, **regroupement des lignes d'une même entreprise** (un rapportage mensuel donne plusieurs lignes par PME), écran de vérification (montants aberrants, doublons, pourcentages hors bornes) et création seulement au dernier clic. **Aucune colonne n'est perdue** : tout ce qui n'a pas de champ dédié est conservé sur la fiche, chiffres d'affaires déclarés en tête. Tous les dossiers entrent au **Sourcing**. Lecteur .xlsx maison, sans dépendance ni migration. | à tester | non |
| À l'import : **portefeuille / programme non assigné au départ**, assignable ensuite — les dossiers entrent au stade « Sourcing » sans `program_id`, le rattachement se fait depuis le pipeline | à tester | non |

---

## Phase 4 — Impact, ESG & reporting

| Item | Statut | Migration |
|---|---|---|
| **Secteurs EHS (IFC)** — le **programme** porte une **famille** de secteurs, chaque **entreprise** son **secteur précis** (liste ordonnée selon la famille du programme) | fait | 0013 |
| Indicateurs d'impact IPDEV2 alignés sur la fiche I&P — **grille de notation complète** reprise de l'outil d'analyse ESG d'I&P : 10 critères notés sur 4 dimensions (Employés 12, Clients 4, Contractants 4, Entrepreneurs 12 = **32**) + 4 bonus/malus comptés à part, total et **note comité sur 3** calculés en direct. Fin de la saisie d'un score à la main. Détail des réponses conservé sans migration. **Reste à trancher : la dimension genre, que l'outil source renvoie au référentiel IPAE sans barème.** | à tester | non |
| **Export fiche entreprise** (trimestriel, format I&P) — le **modèle d'origine « 01. Fiche entreprise_Template [FR] » est REMPLI**, pas régénéré : sa mise en page, ses deux pages « Fiche entreprise », ses graphiques, ses images et ses formules sont conservés (remplisseur ZIP maison qui n'écrit QUE les valeurs et retire la calcChain pour forcer le recalcul). Reporting de tout le portefeuille = une archive d'un fichier par société. Extraction, fiche I&P et réinjection **réunies sous un seul écran à 3 onglets** (Collecte · Extraire · Rapports & fiches I&P) ; l'ancienne « Passerelle Excel » redirige. | à tester | non |
| **Export rapport ESG & Impact** (annuel, modèle IPDEV) — matière chiffrée du modèle en 6 parties : résultats clés, répartitions sectorielle/programme/pays en nombre **et** en montant, emplois vs N-1, genre, gouvernance, notation des risques et rating d'impact IPDEV2, plans d'action E&S, revue par entreprise. Sélecteur d'exercice, impression / PDF. **Les rubriques que le modèle attend et que l'outil ne collecte pas encore sont listées** en fin de document plutôt que laissées vides. **Inclut le contenu QUALITATIF** (récit / étude de cas / témoignage par entreprise, ~2 diapos du modèle) : conçu à rebours du modèle IPDEV — chaque champ narratif attendu devient un champ de la fiche société qui alimente le rapport (au lieu de retaper le narratif chaque année). Ce qui existe déjà et sera réutilisé : Profil de l'entreprise, bloc Promoteur, onglet Création de valeur. | à tester | non |
| **Passerelle Excel bidirectionnelle** — écriture de vrais classeurs `.xlsx` (sans dépendance) : (a) **extraction à la carte**, 22 jeux en 7 familles (portefeuille, instruments, échéances, actionnariat, flux, états financiers OHADA, budget, indicateurs, tâches, comptes rendus, comités, ESG diagnostics/actions/impact, accélération, due diligence, création de valeur, pipeline, contacts, documents, programmes, partenaires) cochés à volonté → **un seul classeur**, une feuille par jeu, filtres programme / type de suivi / plage de périodes ; (b) **fiche entreprise au format I&P** ; (c) **réinjection** avec écarts affichés avant → après. | à tester | non |

---

## Phase 5 — Suite (retours du 19/07)

| Item | Statut | Migration |
|---|---|---|
| ~~**Découvrabilité de « Écarter »**~~ — **abandonné** (Médéa, 19/07) : pas besoin de la rendre plus visible. | abandonné | non |
| **Passage en comité → note automatique dans le Suivi** : chaque nouveau passage (dossier ou société) écrit une note « Réunion » datée (type, nature, décision, conditions, participants). | vérifié navigateur | non |
| **Fiche d'instruction générable à tout stade** : le bouton n'est plus réservé au pipeline avancé — on peut partager l'info d'un dossier tôt. | vérifié navigateur | non |
| **Champs avancés auto-ouverts en pipeline avancé** : dès qu'un dossier passe en pipeline avancé (comité d'ouverture ou manuel), valo pré-money et closing s'affichent d'emblée. | vérifié navigateur | non |
| **Présentation du dossier alignée sur celle de la société** : Promoteur, Identité (année, ville, stade), Profil de l'entreprise, Rationnel — les mêmes blocs qu'au Portefeuille (`DealPresentationTab`, `PromoterCard` partagé). | vérifié navigateur | **0037** |
| **Promoteur enrichi + évaluation** : descriptif (bio, plus haut diplôme, âge, sexe H/F/Non binaire) et **grille d'évaluation** en 5 critères notés 0–4 + justification, appréciation générale et note de synthèse comité /3 (`PromoterEvalModal`, stockée en jsonb `promoter_eval`). Critères : Intégrité & gouvernance · Coachability · Rigueur de gestion & exécution · Engagement & résilience · Expérience & vision. | vérifié navigateur | **0037** |
| Bug pré-existant corrigé : `JournalClient` (onglet Modifications du Journal d'audit) rendait un fragment de liste sans `key` → overlay d'erreur en dev. Passé en `<Fragment key={e.id}>`. | vérifié navigateur | non |
| **Réplique au Portefeuille — présentation & promoteur** : le bloc Promoteur partagé (`PromoterCard`) + évaluation s'affiche aussi sur la fiche société (Présentation). | vérifié navigateur | non |
| **Réplique au Portefeuille — historisation des changements de statut** : passer une participation Actif/En difficulté/Sorti/Radié écrit une note datée dans le Suivi (édition manuelle + validation de décision comité). | vérifié navigateur | non |
| **Conversion conservatrice** : convertir un dossier en participation conserve désormais identité (année/ville/stade), profil, **promoteur + évaluation**, et **rattache le journal du Suivi** (décisions, changements d'état, comités) à la société. | testée en réel par Médéa (dossier FinLoop) | **0038** |
| **Journal d'audit — rattachement systématique** : chaque entrée résout son entreprise/dossier parent (via entity_type/entity_id, company_id ou deal_id) et le préfixe au libellé (« EduSmart · CR test », « EduSmart » pour un Diagnostic ESG sans nom propre). N'affecte que les entrées **futures**. | vérifié (transaction annulée) | **0039** |
| Correctifs `key` : `PerfOverviewTable` et `SupportTab` rendaient des fragments de liste sans `key` (même motif que `JournalClient`) → `<Fragment key>`. | vérifié build | non |
| **Notifications email** (Resend) : ① récap hebdo des actions ouvertes de chacun (cron `/api/cron/digest`) ; ② relance 2 j avant l'échéance puis le jour même (cron `/api/cron/reminders`) ; ③ email à l'équipe à chaque décision de comité validée (dossier + société), sauf la personne qui valide ; ④ email « décision en attente de validation » aux valideurs (comités V/E) à la création d'un passage. Bouton **« Recevoir un e-mail de test »** dans Mon compte. Routes protégées par `CRON_SECRET`, crons dans `vercel.json`. **INERTE tant que `RESEND_API_KEY` (+ domaine vérifié) et `CRON_SECRET` ne sont pas posés dans Vercel.** | vérifié navigateur | non |
| **Parallélisme « décisions à valider »** : la to-do du tableau de bord affiche désormais les décisions de comité à valider côté **société** (nom + lien `/portefeuille`), à parité avec les dossiers — le chargement (`todo.ts`) ne prenait que `deal_id`. | vérifié navigateur | non |
| **« Mettre en veille » reçoit la même fiche que « Écarter »** : fiche modale motif + précision (`StandbyDealModal`), 6 motifs pensés pour une *pause*, badge « En veille · motif » sur la fiche dossier et dans la liste, motif effacé à la réactivation. | vérifié navigateur | **0035** |
| **Historisation des transitions d'état dans le Suivi** : chaque écartement / mise en veille écrit une **note datée** (en plus du badge) ; la **réactivation** écrit une **seconde note** qui referme l'épisode (motif initial + post-mortem repris, relu en base). Le post-mortem n'est **pas effacé** à la réactivation (récit du dossier, déjà repris dans la note). | vérifié navigateur | non |
| **Post-mortem daté** : horodaté à la rédaction (`post_mortem_at`), « Rédigé le … » affiché dans l'encart (disparaît si vidé). | vérifié navigateur | **0036** |
| **Pas de temps MENSUEL pour les rapports d'entreprise** (demande Saint-André) + **aligner les données**. `periods.ts` gère le mensuel (`2026-M07` → « juil. 2026 »), réglage **« Cadence de reporting »** dans Paramètres (mensuel par défaut, surchargeable par type — migration **0040**), écrans branchés : Suivi de la remontée, Indicateurs d'accompagnement, KPIs. | vérifié navigateur | **0040** |
| **Cadence différenciée PAR PROGRAMME** : matrice programme × type (héritage programme×type → défaut programme → type global → défaut fonds). Section « Par programme » dans Paramètres ; `funds.reporting_cadence.byProgram` (jsonb, pas de migration). Écrans société résolus via le programme ; reporting avec filtre programme pilotant la cadence. | vérifié navigateur | non |
| **Fiche de suivi cadencée** : la fiche société/dossier suit la cadence de reporting de l'entité (mensuel → « juil. 2026 », trimestriel → « T2 2026 »), bornes de période généralisées, libellés neutralisés (« période »). Budget/réalisé : **reste annuel** (grille OHADA par exercice — correct par nature). | fait (vérif fiche à faire en session connectée) | non |
| **Questionnaire d'impact par PME** (référentiel I&P/IPDEV, 7 sections, annuel). **Rempli par l'ENTREPRENEUR via un lien public** (`/q/[token]`, sans compte) ; Idawa **relit / corrige / valide**. Onglet ESG : créer un exercice, envoyer le lien par email, analyser. Tables `impact_questionnaires` (0041) + circuit (0042). **Boucle + analyse complètes et vérifiées** : ① notation IPDEV alimentée (panneau « Repères du questionnaire » + signaux femmes ≥ 30 %, bonus certification) ② fiche I&P (section « Indicateurs d'impact — questionnaire {année} ») ③ suivi pluriannuel (tableau comparatif par exercice). | vérifié navigateur | **0041, 0042** |

> **Clarification 19/07** : la « fiche entreprise » de Saint-André = le fichier **Analyse Financière** (déjà intégré comme onglet Analyse financière). Ce n'était pas une nouvelle pièce jointe. Point du tableau d'exécution reclassé « livré ».

---

## Phase 6 — prochaine session (demandes du 20/07)

| Item | Statut | Migration |
|---|---|---|
| **Règles de composition du mot de passe** : au premier choix (`/reinitialiser`) ET au changement (Mon compte), la composition est affichée sous forme de **checklist qui s'actualise à la frappe** (✓/✗) et **exigée** avant enregistrement (bouton grisé tant que non conforme). Règle : **≥ 10 caractères, minuscule, majuscule, chiffre, caractère spécial** — module partagé `src/lib/password-policy.ts` + `src/components/shared/PasswordChecklist.tsx`. NB : aligner aussi la politique Supabase Auth (tableau de bord) sur cette règle. | **fait** | non |
| **Cahier de tests complet** pour les rôles **Analyste** et **Chargé d'investissement** : scénarios de bout en bout, tests positifs ET négatifs, matrice des droits effective, feuille de résultats → `docs/cahier-de-tests-roles.md`. Point non évident capté : comité **E** enregistre mais **ne valide pas** (validation = V, Direction) ; Paramètres du fonds exige config **E** (hors des deux rôles) ; Journal d'audit gouverné par `users`. | **fait** | non |
| **Document d'onboarding** sympa et vivant (prise en main pour un nouvel arrivant : jour 1, vocabulaire maison, tour en semaine 1, bonnes habitudes, dépannage) → `docs/onboarding.md`. | **fait** | non |
| **Conversion dossier → participation : DUPLIQUER tout le dossier, dossier d'origine gardé INTACT** (migrations **0043 → 0044**). Doctrine (Médéa) : le dossier pipeline est **archivé, conservé tel quel** ; la société reçoit **une copie** de tout l'historique, rien ne se perd. 3 mécaniques : **(1) copie** de lignes indépendantes pour ce qui se poursuit après investissement — KPIs (+ historique de valeurs), ESG, adhésions ; **(2) lecture en transparence** depuis le dossier (aucune copie) pour l'instruction — notes et **due diligence** (affichées en lecture seule dans *Origine / instruction*, groupées par domaine) ; **(3) double clé** `deal_id`+`company_id` sur la même ligne pour comités (→ *Décisions*), contacts, documents. 0044 corrige le 0043 qui *déplaçait* (vidait le dossier) + répare les conversions démo. Vérifié : conversion fraîche en transaction annulée → **dossier 100 % inchangé**, société = KPIs/ESG copiés + comités/contacts partagés + DD lue du dossier. | **fait** | **0043·0044** |
| **Dossier converti = ARCHIVÉ, verrouillé + confirmation avant conversion** (aucune migration). (a) Avant de convertir, le modal ajoute une **étape de confirmation** : bouton *Continuer* → avertissement « la fiche sera archivée, conservée telle quelle et **ne pourra plus être modifiée** — Voulez-vous continuer la conversion ? » → **Non, revenir** / **Oui, convertir et archiver**. (b) Une fois converti (`convertedCompanyId` ou `status='investi'`), la fiche dossier passe en **lecture seule totale quel que soit le rôle** (`writable`/`comitesWritable`/`comitesValidatable = … && !converted`) : édition coupée sur tous les onglets ET les comités (enregistrer/modifier/supprimer/valider). Repère **badge « 🔒 Archivé »** dans l'en-tête + **bandeau d'avertissement** avec lien *Voir la participation* ; le bandeau « lecture seule / rôle » est masqué quand archivé (il serait trompeur). Vérifié à l'écran (BatiPro archivé verrouillé ; parcours de confirmation testé sur un dossier éligible temporaire puis nettoyé). | **fait** | non |
| Vérif visuelle de la **fiche de suivi mensuelle** (faite en code, à confirmer en session connectée). | à faire | non |

---

## Ordre de test après chaque déploiement

Le chemin critique de l'application, à dérouler dans cet ordre :

1. **Connexion** → le tableau de bord s'affiche.
2. **Pipeline** → la liste des dossiers apparaît (En cours / En veille / Clôturés).
3. **Ouvrir un dossier** → les onglets se chargent (Comités, Suivi, KPIs…).
4. **Portefeuille** → la liste des sociétés apparaît (En portefeuille / Sorties & radiées).
5. **Ouvrir une société** → onglet **Investissement** (instruments + échéancier), puis **Budget & BP** (grille OHADA).
6. **Créer / modifier** un élément (dossier, instrument, ligne budgétaire) → l'enregistrement fonctionne.
7. **Paramètres du fonds** → la configuration d'un programme s'ouvre.

> ⚠️ **Règle apprise** : toute migration doit être **appliquée en base avant** de pousser le code qui lit la nouvelle colonne — sinon la page concernée se vide (incident du 13/07 sur le pipeline).

---

## Jeux de données de test

Rejouables et idempotents, à lancer depuis la racine du projet :

```
node scripts/seed_demo_companies.mjs     # toutes les entreprises : états financiers OHADA,
                                         # budget, KPIs, suivi, ESG, création de valeur,
                                         # due diligence, contacts, documents, cap table
node scripts/seed_demo_deals.mjs         # dossiers du pipeline : thèse, suivi, due diligence,
                                         # comités, KPIs, ESG, création de valeur — le volume
                                         # d'information suit l'étape du dossier
node scripts/seed_demo_support.mjs       # accélération : indicateurs programme et entreprise
node scripts/seed_test_instruments.mjs   # 3 sociétés, 7 instruments variés
node scripts/seed_test_financials.mjs    # 3 sociétés × 3 années × 12 postes OHADA
```
Chacun est rejouable et accepte `--clean` pour retirer ce qu'il a créé.

**Contrôles à lancer avant chaque déploiement :**
```
node scripts/audit_write_access.mjs                  # aucune écriture sans contrôle de droit
node scripts/check_ohada_kpis.mjs                    # tout KPI normalisé est alimentable
node scripts/check_company_program_consistency.mjs   # profil accordé au programme principal
```
