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
| **Correction** — Documents : le tri alphabétique doit porter sur le **nom de l'entreprise** (et non le titre du document) | à faire |

---

## Phase 1 — Socle : instruments & données financières

| Item | Statut | Migration |
|---|---|---|
| **1a** — Modèle instruments (capital / quasi-equity / prêt de campagne) + onglet Investissement | fait | 0012 |
| **1b-1** — Échéancier d'amortissement calculé (différé, annuités, taux plafonné) | fait | non |
| **Budget & BP** — grille OHADA en colonnes d'années, saisie directe, postes modifiables | fait | non |
| **Résumé Investissement** séparé par les 3 types d'instruments | fait | non |
| **1b-2** — Suivi des créances réelles : facturation, encaissements, arriérés vs prévisionnel | fait | 0014 |
| **1c** — Réorganisation fiche société : Investissement / Valorisation / Performance / Structuration | à faire | possible |
| **1d** — Moteur OHADA : saisie **complète** des états financiers → totaux, SIG, bilan fonctionnel, ratios | fait | 0016 |
| **1d-bis** — Import d'états financiers **sans frais** : analyseur qui s'accroche aux **codes OHADA** imprimés + écran de vérification. Entrées : ① copier-coller ② Excel/CSV ③ PDF numérique (pdf.js) ④ image/scan (Tesseract.js, bonus). **Aucune clé API, aucun coût.** | à faire | non |
| **Correction 1d** — Navigation des exercices : afficher les plus **récents en premier**, pouvoir ajouter une année **antérieure ET postérieure**, retirer une colonne | à faire | non |
| **Correction 1b-2** — Vue dédiée des **remboursements par prêt** : engagements, historique des paiements, restant dû (aujourd'hui enfoui dans l'échéancier dépliable) | à faire | non |

---

## Phase 2 — Performance & structuration

| Item | Statut | Migration |
|---|---|---|
| Performance trimestrielle : CA / EBE / taux d'EBE vs N-1 **et** vs budget (▲▼▬) | à faire | oui |
| Structuration & sortie : piste de sortie (put option, formule, cession tiers), méthode de valo, multiple & TRI attendus | fait | 0015 |
| **Correction** — **Plusieurs méthodes de valorisation** et **plusieurs pistes de sortie** possibles (choix multiples au lieu d'un seul) | à faire | oui |
| Décisions portefeuille étendues : réinvestissement, sortie partielle, sortie complète (+ dépréciation, restructuration, conversion, distribution) | à faire | oui |
| Séparation valorisation (annuelle, comité d'audit) / performance (trimestrielle) | à faire | non |
| **Échéancier consolidé au niveau du fonds** : agrégation de toutes les échéances à venir et des arriérés, toutes sociétés confondues (planification de trésorerie) | à faire | non |

---

## Phase 3 — Pipeline avancé

| Item | Statut | Migration |
|---|---|---|
| Stade « pipeline avancé » | à faire | oui |
| Bloc « Next step » sur le dossier | à faire | oui |
| « Post-mortem » (analyse des dossiers écartés) | à faire | oui |
| Masquer ESG & Création de valeur tant que le dossier n'est pas avancé/converti | à faire | non |
| Analyses par source d'entrée du deal flow | à faire | non |

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
