# Migration SharePoint → application Idawa : registre des difficultés

Tenu depuis le 03/10/2026. Chaque difficulté indique où elle a été rencontrée, ce qu'elle bloque et ce qui a été fait (ou ce qui reste à décider).

## A. Passage de OneDrive à SharePoint (fait)

| # | Difficulté | Conséquence | Traitement |
|---|---|---|---|
| A1 | Le dossier OneDrive synchronisé sur le Mac est illisible pour l'assistant (protection macOS), même hors bac à sable. | Impossible de comparer ou de copier depuis le disque. | Lecture par le connecteur Microsoft 365. |
| A2 | Le connecteur Microsoft 365 est en **lecture seule** (droit « Files.ReadWrite.All » non accordé). | L'assistant ne peut ni copier, ni renommer, ni créer de dossier. | Copies et renommages faits par Médéa ; l'assistant compare et liste les écarts. Pour lever la limite : consentement administrateur dans Entra (Enterprise applications → connecteur → Grant admin consent). |
| A3 | Caractères interdits par SharePoint dans les noms (`" * : < > ? / \ \|`). | « 19- Yaslo : Valesse » n'a pas été copié, sans message d'erreur visible. | Renommé « 05- Yaslo - Valesse ». |
| A4 | Doublon « 05- Le Christal » dans le pipeline Bénin. | Deux dossiers pour une même entreprise. | Doublon éliminé, numérotation Bénin 01 à 18. |
| A5 | Numérotation des dossiers de CV sur 2 chiffres puis renommage groupé appliqué deux fois. | Ordre d'affichage faux (001–115) ; un dossier devenu « 0001- 2026-001 et 2026-002 ». | CV renumérotés 001–115. **Reste** : remettre « 0001- … » en « 01- … ». |
| A6 | Tailles différentes après copie (+5 à 10 Ko sur .docx/.xlsx ; ±512 o sur .doc/.xls/.ppt/.msg). | Comparaison fichier à fichier faussement « en écart ». | Écart expliqué (SharePoint réécrit les propriétés) ; ouverture de quelques fichiers pour contrôle. |
| A7 | Copie depuis le Finder : fichiers cachés `.DS_Store` envoyés sur SharePoint. | Bruit dans les dossiers. | Sans conséquence ; à supprimer à l'occasion. |
| A8 | Éléments personnels ou redondants dans Conseil : notes de frais (Business Angels Togo) et archive « 0- Data Room.zip » (Guev). | Non copiés. | **À décider par Médéa** (copier ou laisser hors du site). |
| A9 | Un « Communication site » créé par erreur à côté du site d'équipe. | Risque de confusion sur l'espace de référence. | Espace de référence = site d'équipe « Idawa Capital ». Le site en trop peut être supprimé. |
| A10 | Le dossier RH contient des CV et dossiers d'employés (données personnelles). | Visible par tous les membres du site. | **Reste** : restreindre les droits du dossier 1- RH. |
| A11 | Limite de débit Microsoft Graph (erreur 429) lors des comparaisons volumineuses. | Lectures interrompues. | Reprise après ~70 s. |
| A12 | Le connecteur tronque la lecture des gros classeurs Excel. | Données partielles si lues depuis SharePoint. | Lecture des copies complètes déposées dans `Claude/Import/`. |

## B. Chargement dans l'application (en cours)

| # | Difficulté | Conséquence | Traitement |
|---|---|---|---|
| B1 | Les dossiers du pipeline n'ont **pas de champ « pays »** (seule la fiche participation en a un). | Les 2 dossiers Togo, et les entreprises Enabel hors Bénin, ne peuvent pas être distingués. | Ajout d'une colonne pays sur les dossiers (migration). |
| B2 | « 06- Portefeuille » ne contient **aucune participation** : seulement le dossier de comité d'ouverture de Le Christal (CI et Portefeuille vides). | Rien à créer côté portefeuille. | Les pièces du COD sont rattachées au dossier Le Christal du pipeline. |
| B3 | Les mandats de Conseil autres que Catal1.5°T (AECF, Business Angels Togo, Enabel Afrique, Orange Corners, Économie bleue, WEDAF) **n'ont pas de place dans l'application** : ce ne sont ni des programmes, ni des dossiers d'investissement. | Pas de rattachement possible en l'état. | **À décider** (voir plan). |
| B4 | ADPME : l'export Kobo compte 404 lignes pour **248 PME** (rapports mensuels répétés, 2 rapports sans PME). | Risque de créer une PME par ligne. | Dédoublonnage par l'**identifiant PAEB** (ex. 240030), stable et unique. |
| B5 | ADPME : l'**IFU est inutilisable** comme clé (90 ont perdu leur zéro initial, 4 tronqués, 2 IFU partagés par deux PME : ASAFMA / THEOMINE SOUDURE, Agri Défi Production / LEADER'S GROUP). | Rapprochement faux si on s'y fie. | Jamais de rapprochement par l'IFU. **Consigne de Médéa (03/10) : ni IFU ni RCCM dans les dossiers migrés** (ni champ, ni description, ni données d'import). |
| B6 | ADPME : 117 PME sur 248 ne sont qu'en **préinstruction** ; promoteur et secteur ne sont saisis que sur cette fiche → 11 promoteurs et 17 secteurs absents ; une PME s'appelle « N/A » (id 260023, Dassa-Zoumè). | Fiches incomplètes. | Import tel quel, champs manquants signalés sur la fiche. |
| B7 | ADPME : le CA « N-1 avant sélection » n'a pas d'année explicite (déduite de la date de comité) ; 9 PME déclarent un CA nul ; seules 24 PME ont des rapports mensuels (le dernier en février 2026). | Chiffres clés approximatifs. | CA chargé avec l'année déduite et la source « PAEB — N-1 avant sélection ». |
| B8 | ADPME : le suivi des appuis financiers (63 PME) n'existe que sur SharePoint et Google Drive ; 3 PME du suivi absentes de Kobo (FMA, BMS, Africa Growing Solutions) ; 7 montants exactement à 250 M (plafond ou valeur par défaut ?) et ORANA à 369 M. | Montants douteux. | **À vérifier par Médéa** avant de reprendre les montants. |
| B9 | ADPME : L'Écrin (Cotonou) a un dossier d'instruction mais n'est **pas dans Kobo**. | Absente de l'import automatique. | À créer à la main à partir du dossier. |
| B10 | IDERA : le fichier ne donne **pas de nom d'entreprise**, seulement un titre de projet et la promotrice ; 43 sur 98 sont encore des projets non créés. | Nom du dossier à composer. | Nom = titre du projet (promotrice en champ promoteur). |
| B11 | IDERA : **32 montants aberrants** (24 coûts < 1 M, probablement saisis en millions ; 16 apports supérieurs au coût ; 4 absents ; 3 supérieurs à 10 Md). | Montants faux dans le pipeline. | Montants suspects non repris, signalés en alerte sur le dossier. |
| B12 | IDERA : consentement au partage = oui pour les 98, mais **20 limitent le niveau d'information** (teaser seulement, ou présentation sans le dossier complet). | Contrainte de confidentialité. | Restriction notée sur chaque dossier concerné. |
| B13 | IDERA : 10 des 11 fiches de grands projets (3 à 17 Md) **ne figurent pas** dans le tableau ; coûts identiques deux à deux sur plusieurs fiches (copier-coller probable). | Projets hors liste, chiffres douteux. | Fiches chargées comme dossiers distincts avec alerte sur le coût. |
| B14 | Enabel : **44 fiches et non 46** ; le classement par opérateur ne suit pas le sommaire ; CRIPT CHAD (Tchad) est rangé dans la section Bénin. | 8 entreprises béninoises réelles sur 9. | Pays corrigé pour CRIPT CHAD. |
| B15 | **Doublons entre sources** : BIO PHYTO et AFRI CEREAL (ADPME et Enabel, sûrs) ; ISMAST, BIOLIFE (probables) ; AFRICA GC / AFRICA GREEN CORPORATION (faux positif probable) ; 6 promotrices présentes à la fois chez IDERA et à l'ADPME, souvent un nouveau projet d'une entreprise déjà connue. | Doublons dans le pipeline. | Un seul dossier par entreprise, sources multiples notées ; cas probables soumis à Médéa. |
| B16 | Conseil : 6 mandats sur 8 (AECF BF, Business Angels Togo, Enabel Afrique, Orange Corners, Économie bleue, AECF IIW) et WEDAF **ne contiennent aucune entreprise** : ce sont des propositions, un atelier de formation, des notes d'opportunité ou une gestion de fonds en prospection. | Rien à mettre dans le pipeline ; ces mandats n'ont pas d'équivalent dans l'application (cf. B3). | **À décider** : les laisser sur SharePoint seulement, ou créer un suivi « développement / mandats ». |
| B17 | Catal1.5°T : le parcours du programme (Sourcing → Rencontre → Comité d'éligibilité → Mandate Fit-Check → CI) ne correspond pas aux étapes du pipeline. | Étapes à transposer. | Correspondance proposée : Sourcing/Rencontre → Sourcing ; éligible → Analyse ; MFC favorable → Pipeline avancé ; comités saisis comme passages de comité du programme. |
| B18 | Catal1.5°T : le tracker date du **29/06/2026** ; l'avancement réel n'est que dans les comptes rendus (Bahaau MFC favorable le 24/09, ISMAT éligible le 25/09…) ; 2 entreprises suivies sont **hors tracker** (Qotto/IZILI, God of Love). | Le tracker seul donnerait un état faux. | Étape prise dans le dernier compte rendu daté, le tracker seulement à défaut. |
| B19 | Entreprises présentes à la fois dans Catal1.5°T et dans les listes (Benin Teck, Theomine, Leader's Group à l'ADPME ; ISMAT/ISMAST à l'ADPME et chez Enabel). | Doublons. | Un seul dossier, rattaché au programme Catal1.5°T, sources multiples notées. |
| B20 | Data rooms volumineuses dans Conseil (Qotto 257 Mo, ISMAT, Bahaau, Guev, Amavi ~35 Mo chacune). | Un lien par fichier noierait l'onglet Documents. | Un lien vers le dossier de data room + liens vers les pièces clés (CR, notes, comités). |
| B21 | Document mal classé : « Idawa_Revue Pacte_MU CDCB_v2.docx », rangé dans 07- Conseil/04- Enabel Afrique, est le suivi de négociation du **pacte d'actionnaires d'Idawa avec la CDC Bénin**. | Document sensible au mauvais endroit. | **À déplacer** par Médéa (dossier gouvernance / Setup Fonds). |
| B22 | Catal1.5°T : le contrat et la facture sont au nom de Médéa en **consultante indépendante**, alors que les livrables portent la charte Idawa. | Question de rattachement (le programme est enregistré comme programme d'Idawa). | **À confirmer** par Médéa ; sans effet sur le chargement des entreprises. |
| B23 | Dossiers internes : **pas de suivi consolidé** ; l'étape de chaque dossier se reconstitue à partir des comptes rendus, et 5 dossiers n'en ont aucun (Ylomi, Angèle Esperanza, Fedapay, TILAMED, FAABA). | Étape et date approximatives pour ces 5 dossiers. | Étape « Sourcing », date = pièce la plus récente ; signalé sur le dossier. |
| B24 | FAABA : dossier interne **vide** ; l'entreprise existe dans la liste ADPME (dossier d'instruction 260088). | Doublon potentiel. | Un seul dossier, alimenté par la source ADPME. |
| B25 | Le Christal **en double** : le dossier Pipeline et « 06- Portefeuille/1- COD/01 - LE CHRISTAL » contiennent les mêmes fichiers, alors qu'aucun investissement n'est décidé. | Confusion sur son statut. | Un dossier pipeline ; les liens pointent vers le dossier Pipeline. **À décider** : supprimer la copie Portefeuille. |
| B26 | Le Christal : **contradictions entre documents** (entreprise individuelle ou SARL ; prêt bancaire 2022 de 119 M ou 79 M ; apport du promoteur 48 M ou 63,8 M) ; data room avec 7 .zip vides (~200 o), un fichier de verrou Word (`~$ vital DG.docx`) et des doublons. | Chiffres incertains ; pièces inutilisables. | Pas de chiffre contradictoire repris ; écarts notés au Suivi ; fichiers vides non liés. |
| B27 | Tchaou : clients cités différemment selon les documents (BNS/Agrifood contre Santhoshimathaa ~95 % du CA) ; un CR garde une note interne « ? Je ne trouve pas la référence » ; un fichier « Compte_rendu…20260813.pdf » est en réalité une liste de pièces ; visite datée du 25/08 dans le texte, du 26/08 dans le nom. | Faits contradictoires. | Repris tels qu'au dernier CR (28/09) ; écarts notés. |
| B28 | ANEP : actionnariat 49/51 dans un CR, 49/48/3 dans le mémorandum ; financement « 200 M de dette » ou « 60 % capital / 40 % dette » ; sous-dossier imbriqué en double (« 0- Dataroom/0- Dataroom »). | Montage incertain. | Montant 200 M repris, montage selon le dernier CR (28/09), écart noté. |
| B29 | Yaslo : création en 2020 ou 2022 ; participation de Djossou à 5 % ou 10 %. AfriSime « fondée en 2025 » mais ventes 2024 citées. Fedapay : CA 2025 mal lu dans le PDF (925,6 M ?). | Données incertaines. | Non reprises ou reprises avec alerte « à confirmer ». |
| B30 | Couleur Indigo : le seul CR **ne nomme pas l'entreprise**. Saint-André Kolagbé apparaît côté Idawa le 14/08 et côté Tchaou le 29/09 (erreur d'attribution probable). | Rattachement incertain. | **À confirmer** par Médéa. |
| B31 | Montants hors ticket Idawa (Wakatoon : tour de 2 M€ ; TILAMED : projet de 35 M€ ; MM Lekker : 562 M + 2 M$ ailleurs ; CEVADEL : dossier pour Nutrisète). | Le montant du dossier ne serait pas le ticket d'Idawa. | Montant du dossier laissé vide ; montant du projet indiqué dans la description. |
| B32 | Le modèle de dossier (0- Dataroom, 1- Suivi, 2- ESG, 3- COD, 4- CI, ZZ- Archives) n'est appliqué qu'à 3 dossiers (Le Christal, ANEP, Tchaou) ; les autres rangent leurs pièces à plat. | Liens de documents hétérogènes. | Catégorie de chaque lien déduite du type de pièce (CR, note, comité, financier, juridique). |
| B33 | Le tableau du pipeline ne filtre que par programme et par état : **ni filtre par source, ni recherche, ni filtre par pays**. Avec ~390 dossiers (dont 248 ADPME en sourcing), les 20 dossiers internes seraient noyés. | Pipeline inutilisable au quotidien après chargement. | Ajout d'un filtre par source, d'une recherche par nom et d'un filtre par pays **avant** le chargement des listes. |

## C. Décisions de Médéa (03/10/2026)

- **Enabel** : charger seulement les entreprises du Bénin et du Togo (14) ; les autres restent sur SharePoint. CRIPT CHAD (Tchad) n'est pas chargée.
- **Mandats de Conseil sans entreprise** (B3, B16) : restent sur SharePoint seulement.
- **Montants douteux** (B8, B11, B13, B26–B29) : **repris tels quels**, avec une alerte sur le dossier. Quand deux documents se contredisent, la valeur du document le plus récent est reprise et l'autre est citée dans l'alerte.
- **Déroulé** : par lots. Lot 1 = 20 dossiers internes + entreprises Catal1.5°T ; vérification par Médéa ; lot 2 = listes ADPME, IDERA, Enabel.
- **Ni IFU ni RCCM** dans les dossiers migrés.

## D. Lot 1 chargé (03/10/2026) — 19 dossiers internes + 30 entreprises Catal1.5°T

Chargé en une transaction : 49 dossiers, 81 notes, 3 passages en comité, 227 liens SharePoint, 25 exercices de chiffres clés, 30 adhésions au programme Catal1.5°T. Contrôle après chargement : **0 mention d'IFU ou de RCCM** (dossiers, notes, documents) ; 227 liens sur 227 pointent vers le site d'équipe.

| # | Difficulté | Conséquence | Traitement |
|---|---|---|---|
| B34 | Les « prochaines étapes » des comptes rendus n'ont presque jamais de date (« à court terme », « au plus tôt »), alors que l'application exige une échéance pour toute tâche. | Impossible de créer des tâches sans inventer des dates. | Reprises en liste dans la note « Reprise depuis SharePoint » de chaque dossier, à convertir en tâches avec une date. |
| B35 | Les secteurs des sources sont du texte libre (« 3 Foyers améliorés », « Agro-industrie — ananas »), sans correspondance directe avec les 62 sous-secteurs de l'application. | Colonne secteur vide dans le pipeline. | Secteur cité dans la description ; **classement à faire** (je peux proposer une correspondance). |
| B36 | Ni chargé d'affaires ni analyste ne sont nommés de façon fiable dans les dossiers. | Tous les dossiers « Non assigné ». | **À attribuer** par Médéa. |
| B37 | Le Christal : COD du 09/07 **informel** (« ne vaut pas COD formel »). | Ne peut pas être saisi comme comité d'ouverture sans faire avancer le dossier à tort. | Saisi comme réunion datée au Suivi, pas comme passage en comité ; dossier en « Analyse », en veille. |
| B38 | La recherche SharePoint ne trouve pas encore 8 dossiers sur le site d'équipe (index pas à jour) : KPS, Fedapay, FAABA, On Tech, Agrelev, MM Lekker, Supermarché du Pont, God of Love. | Liens construits par la même règle que les 59 vérifiés, mais non confirmés un à un. | **À tester** en ouvrant un lien de chacun. |
| B39 | ANEP : la data room est rangée dans « 0- Dataroom/0- Dataroom » (16,5 Mo) et n'a pas été listée. | Pièces de la data room non liées une à une. | Lien vers le dossier de data room uniquement. |
| B40 | Le Christal : deux bases de chiffres pour 2024–2025 (« déclaré » et « reconstitué », ce dernier ~2× plus élevé). | Un seul jeu de chiffres par exercice possible. | Chiffres **déclarés** dans les chiffres clés ; reconstitués cités dans la note. |
| B41 | Catal1.5°T : 20 entreprises n'ont pas d'autre état que celui du tracker du 29/06/2026. | État possiblement périmé. | Repris avec l'alerte « état tiré du tracker du 29/06/2026 ». |
| B42 | Les 227 liens fichier par fichier du lot 1 (option B) doublonnaient SharePoint et cassaient au premier renommage. | Doublon, maintenance. | **Option C retenue** (vue en direct du dossier, `docs/sharepoint-et-application.md`) ; activée le 03/10 ; 27 liens de dossier conservés comme rattachement ; **200 liens fichier supprimés** (accord de Médéa). |
| B43 | 22 entreprises Catal1.5°T n'ont pas de dossier propre sur SharePoint (seules 8 en ont un dans « 4- Dossiers »). | Onglet Documents sans dossier pour elles. | Rattachement à faire quand un dossier est créé (onglet Documents → « Rattacher »). |

## E. Lot 2 préparé (03/10/2026) — ADPME/PAEB, IDERA, Enabel (Bénin + Togo)

Essai à blanc réussi, après rapprochement des 6 cas douteux : **339 nouveaux dossiers** (234 PAEB, 96 IDERA, 9 Enabel), **21 dossiers existants enrichis** (même entreprise déjà chargée au lot 1), 376 notes, ~590 exercices de chiffres clés. Tous en Sourcing, Actifs, dans le pipeline non qualifié. 0 mention d'IFU ou de RCCM.

| # | Difficulté | Conséquence | Traitement |
|---|---|---|---|
| B44 | 21 entreprises des listes sont déjà dans l'application (Catal1.5°T et dossiers internes : Le Christal, FedaPay, ISMAT, Benin Teck…). | Doublons si on recrée. | Dossier existant **enrichi** (note de source, chiffres clés, champs vides complétés) ; un exercice déjà renseigné n'est jamais écrasé (3 cas, dont Le Christal 2022-2023 : le CA PAEB concorde avec la note COD). |
| B45 | 9 rapprochements sûrs entre listes (même promotrice IDERA/ADPME, même entreprise ADPME/Enabel). | Doublons. | Un seul dossier, sources cumulées (ex. AGRI-CEFORPA = ADPME + IDERA n° 37 + fiche). |
| B46 | **6 rapprochements douteux** : ALSEC/AGODJIE LODGE (même promotrice), BIOLIFE TECH/BIO LIFE, AFRICA GREEN CORPORATION/AFRICA GC, ISMAST LIFE STOVES/ISMAT, Agri Défi Production/Leader's Group (même promoteur), ENTREPRISE PRO SAINS/Pro Sains International. | Doublon ou fusion à tort. | **Médéa (03/10) : les 6 sont les mêmes entreprises** → un seul dossier chacun, données rapprochées et complétées des deux côtés (note « Rapprochement confirmé par Médéa »). |
| B47 | IDERA : pas de nom d'entreprise. | — | Nom du dossier = titre court du projet + promotrice. |
| B48 | PAEB : CA « N-1, N-2, N-3 avant sélection » sans année. | Années approximatives. | Année estimée à partir de la date de comité, signalée dans la note et sur chaque exercice. |
| B49 | 4 entreprises sans fiche Kobo (FMA, BMS, Africa Growing Solutions, L'Écrin). | Fiches minimales. | Créées avec l'information disponible (appui financier ou dossier d'instruction) et une alerte. |
| B50 | FAABA a deux dossiers SharePoint : le dossier interne (vide) et le dossier d'instruction ADPME. | — | Rattaché au dossier d'instruction (seul à contenir des pièces). 7 dossiers d'instruction rattachés en tout. |

## F. Champs de recherche (03/10/2026) — secteur, stade, tags, effectifs

Objectif fixé par Médéa : des entreprises qui servent aux **recherches** ; remplir le plus de données possible avec l'information disponible.

- **Secteur** : 353 dossiers sur 387 classés dans les 62 sous-secteurs (+ sous-secteurs secondaires quand l'activité couvre deux métiers). Classement fait dossier par dossier à partir du nom, de la description et des notes.
- **Stade de développement** : 363 dossiers. Pour les PME PAEB, règle unique : composante PAEB, corrigée par l'ancienneté (créée en 2023 ou avant → pas « Amorçage »).
- **Tags** (nouveau) : 96 tags, 1 543 posés, en familles — Filière (50, vocabulaire resserré), Thématique (15, liste fermée), Profil (entreprise dirigée par une femme, projet non créé, coopérative…), PAEB (composante, statut, appui financier), Zone (département), Enabel (opérateur), IDERA (partage limité).
- **Effectifs** : 227 exercices complétés (PAEB : effectif permanent ; IDERA : employés déclarés).

| # | Difficulté | Conséquence | Traitement |
|---|---|---|---|
| B52 | 34 dossiers restent **sans secteur** : fiches réduites à un nom (FMA, BMS, GLADIO…) ou à un secteur trop large (« hôtel ou restaurant », « industrie »), et des métiers absents du référentiel (mécanique auto). | Non trouvables par secteur. | Filtre « Secteur non renseigné » pour les reprendre ; **à compléter** à la main, ou ajouter un sous-secteur (ex. Garage & mécanique). |
| B53 | 121 classements en **confiance basse** : fiches PAEB qui ne donnent que le grand secteur déclaré (« Agriculture… » → Production agricole par défaut, « Industrie agro alimentaire » → Transformation). | Secteur probable mais pas certain. | Classement repris ; à corriger au fil de l'eau sur la fiche. |
| B54 | Les filières proposées étaient dispersées (141 libellés : synonymes, métiers). | Recherche par filière inutilisable. | Vocabulaire ramené à 50 filières (synonymes fusionnés, métiers écartés). |
| B55 | Classements faits en 4 lots parallèles avec deux lectures différentes du stade PAEB. | Incohérence. | Règle unique réappliquée à tous les dossiers PAEB. |
