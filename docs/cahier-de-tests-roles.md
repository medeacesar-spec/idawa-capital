# Cahier de tests — rôles **Analyste** et **Chargé d'investissement**

_Idawa Capital · outil de pilotage pipeline & portefeuille_
_Version du 21/07/2026 (màj : échéances obligatoires, to-do « actions à prendre » en 2 groupes, archivage des dossiers convertis, visibilité « Tout le fonds », onglet Origine/instruction ↔ Décisions, extraction sans Partenaires & LPs) · à dérouler après chaque déploiement touchant les droits ou les écrans concernés._

---

## 1. À quoi sert ce cahier

Vérifier, pas à pas, que chacun des deux rôles **peut faire ce qu'il doit faire** et **ne peut pas faire ce qu'il ne doit pas faire**. Chaque scénario est écrit pour être joué par une personne non technique : on suit les étapes, on compare à la colonne **Résultat attendu**, on coche **OK** ou **KO**.

Deux familles de tests :
- **Tests positifs** (✅) — l'action doit réussir.
- **Tests négatifs** (⛔) — l'action doit être **impossible** : bouton absent, champ verrouillé, ou page qui renvoie au tableau de bord. Un test négatif est **réussi quand l'action échoue**.

> ⚠️ Un test négatif « raté » (l'action passe alors qu'elle ne devrait pas) est une **faille de sécurité**, à remonter en priorité.

---

## 2. Préparation

1. Créer (ou réutiliser) **deux comptes de test**, un par rôle, depuis **Utilisateurs & rôles** (avec un compte Administrateur) :
   - `analyste.test@idawacapital.com` → rôle **Analyste**
   - `charge.test@idawacapital.com` → rôle **Chargé d'investissement**
2. Charger les **données de démonstration** (au moins un dossier de pipeline à chaque étape, une société en portefeuille avec instruments, une décision de comité **validée** et une **non validée**).
3. Se connecter **dans une fenêtre de navigation privée** par rôle, pour ne pas mélanger les sessions.
4. Garder ce document ouvert et cocher au fur et à mesure.

---

## 3. Matrice des droits effective (rappel de référence)

Niveaux : **–** aucun · **L** lecture · **V** validation · **E** édition.
Règle interne : `édition (E) ≥ validation (V) ≥ lecture (L) ≥ aucun (–)`.

| Domaine / écran | Analyste | Chargé d'investissement | Écran gouverné |
|---|:---:|:---:|---|
| **Pipeline** | **E** | **E** | Liste + fiche dossier (créer, instruire, faire évoluer) |
| **Portefeuille** | **L** | **E** | Liste + fiche société (instruments, valo, budget, KPIs…) |
| **Comités** | **L** | **E** | Passages en comité + décisions |
| **Reporting** | **E** | **E** | Reporting & extraction (dont export Excel) |
| **Performance · ESG global** (`consolide`) | **–** | **–** | Performance consolidée, ESG & Impact global, rapport ESG |
| **Répertoire contacts** | **L** | **E** | Écran Contacts global |
| **Documents** | **L** | **E** | Bibliothèque de documents globale |
| **Partenaires & LPs** | **–** | **–** | Écran Partenaires |
| **Paramètres · Biblio. KPIs** (`config`) | **L** | **L** | Bibliothèque KPIs (L suffit) ; **Paramètres du fonds exige E** |
| **Utilisateurs & rôles** (`users`) | **–** | **–** | Utilisateurs & rôles **et Journal d'audit** |

**Points non évidents à tester en priorité :**
- **Comités** : le niveau **E** (Chargé) permet d'**enregistrer / modifier / supprimer** un passage en comité, mais **PAS de valider une décision**. La **validation** est réservée au niveau **V** (Direction / Administrateur). → un Chargé enregistre le comité, la Direction valide.
- **Paramètres du fonds** exige **config = E** : ni l'Analyste ni le Chargé (config **L**) n'y accèdent → renvoi au tableau de bord. En revanche la **Bibliothèque KPIs** (config **L**) leur est ouverte.
- **Journal d'audit** est gouverné par le domaine **Utilisateurs** (`users`) : les deux rôles en sont exclus.
- **Performance**, **ESG & Impact global** et le **Rapport ESG** dépendent de `consolide` = **–** pour les deux rôles → renvoi au tableau de bord.
- **Portefeuille** : l'Analyste est en **lecture seule** (champs verrouillés, boutons d'écriture masqués) ; le Chargé édite.

---

## 4. Cahier de tests — rôle **ANALYSTE**

> Profil : instruit les dossiers du **pipeline** (édition), **consulte** le portefeuille sans le modifier, saisit du **reporting**, mais n'a **ni la performance consolidée, ni les paramètres, ni les partenaires, ni le journal, ni la validation de comité**.

### 4.1 Navigation & accès aux écrans

| N° | Objectif | Étapes | Résultat attendu | OK / KO |
|---|---|---|---|:---:|
| A-01 | Connexion | Se connecter avec le compte Analyste | Le tableau de bord s'affiche | ☐ |
| A-02 | Menu latéral | Regarder les entrées visibles dans le menu | Voit au moins : Tableau de bord, Pipeline, Portefeuille, Reporting, Contacts, Documents, Bibliothèque KPIs, Mon compte | ☐ |
| A-03 ⛔ | Performance interdite | Aller sur **Performance** (ou taper l'URL `/performance`) | **Renvoi au tableau de bord** | ☐ |
| A-04 ⛔ | ESG global interdit | Aller sur **ESG & Impact** (`/esg`) | **Renvoi au tableau de bord** | ☐ |
| A-05 ⛔ | Partenaires interdit | Aller sur **Partenaires & LPs** | **Renvoi au tableau de bord** | ☐ |
| A-06 ⛔ | Journal interdit | Aller sur **Journal d'audit** (`/journal`) | **Renvoi au tableau de bord** | ☐ |
| A-07 ⛔ | Paramètres interdits | Aller sur **Paramètres du fonds** | **Renvoi au tableau de bord** | ☐ |
| A-08 ⛔ | Utilisateurs interdit | Aller sur **Utilisateurs & rôles** | **Renvoi au tableau de bord** | ☐ |
| A-09 ✅ | Bibliothèque KPIs (lecture) | Ouvrir **Bibliothèque KPIs** | La page s'affiche (consultation) | ☐ |

### 4.2 Pipeline (édition — cœur du métier Analyste)

| N° | Objectif | Étapes | Résultat attendu | OK / KO |
|---|---|---|---|:---:|
| A-10 ✅ | Créer un dossier | Pipeline → « Nouveau dossier » → remplir → enregistrer | Le dossier est créé et apparaît dans la liste | ☐ |
| A-11 ✅ | Instruire | Ouvrir un dossier → onglets (thèse, due diligence, suivi…) → saisir | Les saisies s'enregistrent | ☐ |
| A-12 ✅ | Faire évoluer l'étape | Changer l'étape du dossier (ex. Analyse → Pipeline avancé) | L'étape change ; ESG / Création de valeur apparaissent au stade avancé | ☐ |
| A-13 ✅ | Ajouter une tâche de suivi | Onglet **Suivi** → ajouter une tâche avec échéance | La tâche apparaît ; « prochaine étape » se met à jour en tête de fiche | ☐ |
| A-14 ✅ | Écarter / mettre en veille | Écarter un dossier → saisir le motif | Fiche à motif + **note datée** au Suivi ; post-mortem si écarté | ☐ |

### 4.3 Comités — vus mais non modifiés

| N° | Objectif | Étapes | Résultat attendu | OK / KO |
|---|---|---|---|:---:|
| A-15 ✅ | Consulter les comités | Fiche dossier → onglet **Comités** | Les passages et décisions sont **visibles** | ☐ |
| A-16 ⛔ | Pas d'enregistrement | Chercher le bouton « Enregistrer un passage » | Bouton **absent** ; message « Aucun passage… » sans invite à créer | ☐ |
| A-17 ⛔ | Pas de validation | Chercher l'action « Valider » sur une décision | Action **absente** | ☐ |

### 4.4 Portefeuille — lecture seule

| N° | Objectif | Étapes | Résultat attendu | OK / KO |
|---|---|---|---|:---:|
| A-18 ✅ | Consulter une société | Portefeuille → ouvrir une société | La fiche s'ouvre, **bandeau « lecture seule »** visible | ☐ |
| A-19 ⛔ | Aucun bouton d'écriture | Parcourir les onglets (Investissement, Valorisation, Budget, KPIs…) | **Aucun** bouton créer / modifier / supprimer | ☐ |
| A-20 ⛔ | Champs verrouillés | Cliquer dans les grilles (états financiers, budget, échéancier) | Champs **non éditables** (`readOnly`) ; la navigation entre exercices reste possible | ☐ |
| A-21 ✅ | Naviguer les exercices | Utiliser les flèches de la fenêtre d'exercices | La fenêtre glisse ; aucune modification n'est écrite | ☐ |

### 4.5 Reporting, Contacts, Documents

| N° | Objectif | Étapes | Résultat attendu | OK / KO |
|---|---|---|---|:---:|
| A-22 ✅ | Reporting / extraction | Ouvrir **Reporting & extraction** | La page s'affiche ; l'Analyste peut lancer une extraction | ☐ |
| A-23 ✅ | Export Excel | Exporter un jeu (pipeline ou portefeuille) vers Excel | Le fichier se télécharge | ☐ |
| A-24 ✅ | Contacts (lecture) | Ouvrir **Contacts** | Le répertoire s'affiche | ☐ |
| A-25 ⛔ | Contacts (pas d'écriture globale) | Chercher « Ajouter un contact » dans le répertoire global | Bouton **absent** (mais il peut joindre un contact **depuis une fiche dossier** qu'il édite) | ☐ |
| A-26 ✅ | Documents (lecture) | Ouvrir **Documents** | La bibliothèque s'affiche | ☐ |
| A-27 ⛔ | Documents (pas de dépôt global) | Chercher le dépôt dans la bibliothèque globale | Action **absente** (dépôt possible depuis une fiche dossier qu'il édite) | ☐ |

### 4.6 Mon compte

| N° | Objectif | Étapes | Résultat attendu | OK / KO |
|---|---|---|---|:---:|
| A-28 ✅ | Changer son mot de passe | Mon compte → Mot de passe → taper un mot de passe | La **checklist** (≥10 car., minuscule, majuscule, chiffre, spécial) passe au vert ; bouton actif seulement une fois conforme + confirmé | ☐ |
| A-29 ⛔ | Mot de passe faible refusé | Saisir `abc123` | Bouton **grisé** ; règles en rouge ; enregistrement impossible | ☐ |

---

## 5. Cahier de tests — rôle **CHARGÉ D'INVESTISSEMENT**

> Profil : édite le **pipeline** ET le **portefeuille**, **enregistre les comités** (mais ne les **valide** pas), fait du reporting, gère contacts & documents. **Exclu** de la performance consolidée, des paramètres du fonds, des partenaires, du journal et des utilisateurs.

### 5.1 Navigation & accès aux écrans

| N° | Objectif | Étapes | Résultat attendu | OK / KO |
|---|---|---|---|:---:|
| C-01 | Connexion | Se connecter avec le compte Chargé | Le tableau de bord s'affiche | ☐ |
| C-02 ✅ | Portefeuille éditable | Ouvrir une société | Fiche ouverte **sans** bandeau « lecture seule » | ☐ |
| C-03 ⛔ | Performance interdite | Aller sur **Performance** | **Renvoi au tableau de bord** | ☐ |
| C-04 ⛔ | ESG global + Rapport ESG interdits | Aller sur `/esg` puis `/esg/rapport` | **Renvoi au tableau de bord** dans les deux cas | ☐ |
| C-05 ⛔ | Partenaires interdit | Aller sur **Partenaires & LPs** | **Renvoi au tableau de bord** | ☐ |
| C-06 ⛔ | Journal interdit | Aller sur **Journal d'audit** | **Renvoi au tableau de bord** | ☐ |
| C-07 ⛔ | Paramètres du fonds interdits | Aller sur **Paramètres du fonds** | **Renvoi au tableau de bord** (config = L, il faut E) | ☐ |
| C-08 ⛔ | Utilisateurs interdit | Aller sur **Utilisateurs & rôles** | **Renvoi au tableau de bord** | ☐ |
| C-09 ✅ | Bibliothèque KPIs | Ouvrir **Bibliothèque KPIs** | La page s'affiche | ☐ |

### 5.2 Pipeline (édition)

| N° | Objectif | Étapes | Résultat attendu | OK / KO |
|---|---|---|---|:---:|
| C-10 ✅ | Créer / instruire un dossier | Comme A-10 à A-14 | Toutes les actions réussissent | ☐ |
| C-11 ✅ | Convertir un dossier | Sur un dossier abouti → « Convertir en participation » | La société est créée en conservant identité, promoteur + évaluation, et le journal du Suivi est rattaché | ☐ |

### 5.3 Comités — enregistre mais ne valide pas ⚠️

| N° | Objectif | Étapes | Résultat attendu | OK / KO |
|---|---|---|---|:---:|
| C-12 ✅ | Enregistrer un passage | Fiche dossier ou société → onglet **Comités** → « Enregistrer un passage » → CR + décision | Le passage est créé | ☐ |
| C-13 ✅ | Modifier / supprimer un passage **non validé** | Modifier puis supprimer un passage non encore validé | Actions possibles | ☐ |
| C-14 ⛔ | **Ne peut PAS valider** | Chercher l'action « Valider » sur une décision | Action **absente** (validation réservée à la Direction / Administrateur) | ☐ |
| C-15 ⛔ | Passage validé verrouillé | Sur un passage **déjà validé** | Boutons modifier / supprimer **absents** | ☐ |

### 5.4 Portefeuille (édition)

| N° | Objectif | Étapes | Résultat attendu | OK / KO |
|---|---|---|---|:---:|
| C-16 ✅ | Instruments & échéancier | Onglet Investissement → ajouter un instrument / saisir un encaissement | Enregistré ; l'échéancier se recalcule | ☐ |
| C-17 ✅ | Valorisation | Onglet Valorisation → proposer une valorisation | La proposition est enregistrée (statut « Proposée ») | ☐ |
| C-18 ⛔ | Validation de valorisation | Chercher à **valider** la valorisation (chiffre ferme) | Action **absente** : la validation exige `comites = V` (Direction) | ☐ |
| C-19 ✅ | Grilles de saisie | États financiers / Budget & BP → saisir une valeur | La valeur s'enregistre (vérifier aussi côté base si possible) | ☐ |
| C-20 ✅ | Décisions de portefeuille | Onglet Décisions → enregistrer une décision (ex. Mise sous surveillance) | Enregistrée ; le statut de la société se met à jour le cas échéant | ☐ |

### 5.5 Reporting, Contacts, Documents

| N° | Objectif | Étapes | Résultat attendu | OK / KO |
|---|---|---|---|:---:|
| C-21 ✅ | Reporting + export Excel | Ouvrir Reporting → exporter | Le fichier se télécharge | ☐ |
| C-22 ✅ | Répertoire contacts (écriture) | Contacts → « Ajouter un contact » | L'ajout réussit | ☐ |
| C-23 ✅ | Bibliothèque documents (écriture) | Documents → déposer un document | Le dépôt réussit | ☐ |

### 5.6 Mon compte

| N° | Objectif | Étapes | Résultat attendu | OK / KO |
|---|---|---|---|:---:|
| C-24 ✅ | Mot de passe | Comme A-28 / A-29 | Même comportement (checklist + validation) | ☐ |

---

## 6. Tests transverses (à jouer avec les deux rôles)

| N° | Objectif | Résultat attendu | Analyste | Chargé |
|---|---|---|:---:|:---:|
| T-01 ⛔ | **Contournement par URL directe** : taper l'URL d'un écran interdit (`/performance`, `/parametres`, `/journal`, `/partenaires`, `/utilisateurs`) | Renvoi systématique au tableau de bord — jamais la page | ☐ | ☐ |
| T-02 ✅ | **Traçabilité** : une action d'écriture apparaît au Journal d'audit sous le **bon auteur** (à vérifier avec un compte Admin après coup) | L'entrée cite l'auteur, l'entité et l'avant/après | ☐ | ☐ |
| T-03 ✅ | **Notifications** : l'utilisateur reçoit son récap / ses relances (si `CRON_SECRET` posé dans Vercel) | E-mail reçu ; sinon inerte (attendu) | ☐ | ☐ |
| T-04 ✅ | **Échéance obligatoire** : ajouter une action de suivi (idem action ESG, Création de valeur, point de due diligence) **sans** échéance | Bouton **Enregistrer bloqué** + message rouge « échéance requise » ; impossible d'enregistrer sans date | ☐ | ☐ |
| T-05 ✅ | **Motif au changement d'échéance** : modifier l'échéance d'une action existante | Un champ **« Motif du changement »** apparaît (obligatoire) ; à l'enregistrement, une **note datée** est écrite au journal du Suivi (ancienne → nouvelle date + motif) | ☐ | ☐ |
| T-06 ✅ | **Repère « sans date »** : une activité encore sans échéance | Affiche en rouge **« échéance à définir »** dans sa liste | ☐ | ☐ |
| T-07 ✅ | **To-do « actions à prendre »** (tableau de bord) | Groupe **urgent** (en retard ou échéance < 7 jours) affiché ; le reste replié sous **« + N actions plus tard »** ; les décisions de comité remontent avec un délai par défaut de **3 jours ouvrables** | ☐ | ☐ |
| T-08 ✅ | **Vue « Tout le fonds »** : le sélecteur « Mes actions / Tout le fonds » de la to-do | **Visible** pour Analyste et Chargé (rôles internes) ; il serait **absent** pour un rôle externe (Auditeur, Observateur / LP) | ☐ | ☐ |
| T-09 ✅⛔ | **Conversion → archivage** : convertir un dossier (nécessite une décision d'investissement validée en comité) | Une **confirmation** s'affiche (« la fiche sera archivée, non modifiable — Voulez-vous continuer ? Oui / Non ») ; après conversion, le dossier porte le badge **« Archivé »**, un bandeau d'avertissement, et **n'est plus modifiable** (tous les onglets ET les comités verrouillés), même pour un administrateur | ☐ | ☐ |
| T-10 ✅ | **Fiche de suivi** (bouton « Fiche de suivi » sur une société) | S'ouvre, imprimable / PDF, titrée selon la cadence : **« Fiche de suivi mensuelle / trimestrielle / annuelle »** cohérente avec la période affichée | ☐ | ☐ |
| T-11 ✅ | **Origine / instruction vs Décisions** (sur une société **issue d'un dossier**) : ouvrir l'onglet *Origine / instruction*, puis *Décisions* | *Origine / instruction* montre **Canal source du dossier**, **Rationnel / thèse**, **Passages en comité (instruction)** et **Due diligence réalisée** (lecture seule). *Décisions* ne contient QUE les décisions **post-investissement** (vide tant qu'il n'y en a pas) — les comités d'instruction n'y sont plus | ☐ | ☐ |
| T-12 ⛔ | **Extraction sans Partenaires & LPs** : Reporting → *Extraire des données*, famille **Référentiel** | Propose **Contacts · Documents · Programmes** ; **Partenaires & LPs n'y figure pas** (donnée réservée) | ☐ | ☐ |

> ℹ️ **T-01 est le test le plus important.** Masquer un bouton ne suffit pas : l'écran doit refuser l'accès **même en tapant l'URL**. C'est ce que garantissent les gardes `requirePerm` côté serveur. (Rappel : le verrou base de données par rôle — RLS — reste « à voir éventuellement » ; tant qu'il n'est pas posé, une personne qui contournerait complètement l'interface pourrait encore écrire. Les gardes testés ici couvrent l'usage par l'interface.)

---

## 7. Feuille de résultats

| Rôle | Tests positifs OK / total | Tests négatifs OK / total | Anomalies bloquantes | Testé par | Date |
|---|---|---|---|---|---|
| Analyste | ___ / 20 | ___ / 9 | | | |
| Chargé d'investissement | ___ / 17 | ___ / 8 | | | |
| Transverses (T-01 → T-12) | ___ / 12 (positifs + négatifs) | — | | | |

**Anomalies relevées** (n° du test, écran, ce qui s'est passé, gravité) :

1.
2.
3.

---

_Ce cahier reflète la matrice des droits par défaut des rôles préréglés. Si un rôle a été personnalisé depuis **Utilisateurs & rôles**, se reporter à sa ligne dans la matrice avant de jouer les scénarios._
