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
| **Consolidation de l'accélération** sur la page Performance : entreprises suivies, budget, décaissé, taux d'exécution, indicateurs par programme | à tester | non |
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
| Emails aux personnes assignées à une action | à tester | non |
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
| **Outil d'import du pipeline** (Médéa fournira des exemples de fichiers) — réutilise l'analyseur de l'import des états financiers | à faire | non |
| À l'import : **portefeuille / programme non assigné au départ**, assignable ensuite | à faire | non |

---

## Phase 4 — Impact, ESG & reporting

| Item | Statut | Migration |
|---|---|---|
| **Secteurs EHS (IFC)** — le **programme** porte une **famille** de secteurs, chaque **entreprise** son **secteur précis** (liste ordonnée selon la famille du programme) | fait | 0013 |
| Indicateurs d'impact IPDEV2 alignés sur la fiche I&P (emplois, genre, formalisation, producteurs…) | à faire | oui |
| Contenu qualitatif (profils entrepreneurs, études de cas, témoignages) | à faire | oui |
| **Export fiche entreprise** (trimestriel, format I&P) | à faire | non |
| **Export rapport ESG & Impact** (annuel, modèle IPDEV) | à faire | non |
| **Passerelle Excel bidirectionnelle** : sortir les données vers Excel pour présenter (à un bailleur, un entrepreneur…) **et** réinjecter dans l'outil ce qui a été travaillé sous Excel. Même moteur que l'import des états financiers (analyseur + écran de vérification). Éventuellement un module dédié. | à faire | non |

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
node scripts/seed_test_instruments.mjs   # 3 sociétés, 7 instruments variés
node scripts/seed_test_financials.mjs    # 3 sociétés × 3 années × 12 postes OHADA
```
