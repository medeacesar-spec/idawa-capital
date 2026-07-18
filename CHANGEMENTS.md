# Changements à faire — Idawa Capital

Objectif-nord : **coller au système opérationnel I&P/IPDEV** et **sortir les rapports en un clic** aux formats des modèles partagés (fiche entreprise trimestrielle, rapport ESG & Impact annuel).

**Priorités** : `P1` = à faire maintenant · `P2` = ensuite · `P3` = plus tard
**Statuts** : `à faire` · `en cours` · `à tester` · `fait`

---

## À faire

| # | Changement | Priorité | Statut | Migration ? |
|---|---|---|---|---|
| C1 | **Secteur EHS** (Paramètres du fonds → Paramètres ESG) : remplacer le texte libre par une **liste déroulante** IFC | P1 | à faire | non |
| C2 | **1b-2 — Suivi des créances réelles** : facturation, encaissements, arriérés par échéance (comparé au prévisionnel) | P1 | à faire | oui |
| C3 | **Décisions portefeuille étendues** : réinvestissement, sortie partielle, sortie complète (+ dépréciation, restructuration, conversion, distribution) | P2 | à faire | oui |
| C4 | **1c — Réorganisation fiche société** : séparer Investissement / Valorisation / Performance / Structuration | P2 | à faire | possible |
| C5 | **1d — Moteur OHADA** : saisie des états financiers → SIG, bilan fonctionnel, ratios automatiques | P2 | à faire | oui |
| C6 | **Performance trimestrielle** : CA / EBE / taux EBE comparés vs N-1 **et** vs budget (▲▼▬) | P2 | à faire | oui |
| C7 | **Structuration & sortie** : piste de sortie (put option, formule, cession tiers), méthode de valo, multiple & TRI attendus | P2 | à faire | oui |
| C8 | **Pipeline avancé** : stade « pipeline avancé », Next step, Post-mortem, masquer ESG/Création de valeur en amont | P3 | à faire | oui |
| C9 | **Impact IPDEV2** : indicateurs alignés sur la feuille Impact de la fiche I&P | P3 | à faire | oui |
| C10 | **Exports 1 clic** : fiche entreprise (trimestrielle) + rapport ESG & Impact (annuel) | P3 | à faire | non |

---

## Ordre de test après chaque déploiement

À dérouler dans cet ordre — c'est le chemin critique de l'application :

1. **Connexion** → tableau de bord s'affiche.
2. **Pipeline** → la liste des dossiers apparaît (onglets En cours / En veille / Clôturés).
3. **Ouvrir un dossier** → les onglets se chargent (Comités, Suivi, KPIs…).
4. **Portefeuille** → la liste des sociétés apparaît (En portefeuille / Sorties & radiées).
5. **Ouvrir une société** → onglet **Investissement** (instruments + échéancier), puis **Budget & BP** (grille OHADA).
6. **Créer / modifier** un élément (dossier, instrument, ligne budgétaire) → l'enregistrement fonctionne.
7. **Paramètres du fonds** → la configuration d'un programme s'ouvre.

> ⚠️ Règle apprise : **toute migration doit être appliquée en base AVANT de pousser le code** qui lit la nouvelle colonne, sinon la page concernée se vide (incident du 13/07 sur le pipeline).

---

## Fait récemment

- Phase 0 : terminologie « valorisation », documents triés & datés, source d'entrée (+ précision), champs avancés masqués, date sur chaque événement.
- Phase 1a : modèle **instruments** (capital / quasi-equity / prêt de campagne) + onglet Investissement.
- Phase 1b-1 : **échéancier d'amortissement** calculé (différé, annuités, taux plafonné).
- **Budget & BP** : grille OHADA en colonnes d'années, saisie directe, postes personnalisables.
- Jeux de test rejouables : `scripts/seed_test_instruments.mjs`, `scripts/seed_test_financials.mjs`.
