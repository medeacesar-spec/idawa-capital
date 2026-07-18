-- Décisions de comité propres à l'ACCÉLÉRATION.
--
-- Les décisions existantes sont toutes financières : sortie partielle, dépréciation,
-- conversion, distribution. Aucune ne s'applique à une PME que le fonds accompagne sans
-- rien détenir. Or il y a bien des décisions à tracer pour elle, et elles engagent autant :
-- son admission dans un programme, la prolongation de l'appui, sa sortie, son exclusion.
--
-- Effet sur le statut de la société, une fois la décision validée :
--   Sortie du programme -> Sorti      (l'accompagnement s'achève normalement)
--   Exclusion           -> Radié      (il s'achève mal)
-- Admission et Prolongation ne changent pas le statut : elles ouvrent ou prolongent.

alter table committee_passages drop constraint if exists committee_passages_outcome_check;

alter table committee_passages add constraint committee_passages_outcome_check
  check (outcome in (
    -- Dossier
    'Investissement',
    -- Participation
    'Réinvestissement', 'Sortie partielle', 'Sortie complète', 'Radiation',
    'Dépréciation', 'Restructuration', 'Conversion', 'Distribution', 'Mise sous surveillance',
    -- Entreprise accélérée
    'Admission au programme', 'Prolongation de l''accompagnement',
    'Sortie du programme', 'Exclusion du programme'
  ));
