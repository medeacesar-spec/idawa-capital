-- Décisions de portefeuille étendues (retour de Médéa).
--
-- La vie d'une participation ne se résume pas à « on sort » ou « on radie » : un comité
-- décide aussi de réinvestir, de sortir partiellement, de déprécier une valorisation, de
-- restructurer une dette, de convertir du quasi-equity en capital, de distribuer, ou de
-- placer une société sous surveillance. Chacune de ces décisions doit pouvoir être tracée
-- et validée par le même circuit que les autres.
--
-- « Sortie » devient « Sortie complète », pour la distinguer d'une sortie partielle.
-- Aucune ligne ne portait encore cette valeur au moment de la migration.

alter table committee_passages drop constraint if exists committee_passages_outcome_check;

update committee_passages set outcome = 'Sortie complète' where outcome = 'Sortie';

alter table committee_passages add constraint committee_passages_outcome_check
  check (outcome in (
    'Investissement',        -- sur un dossier : débloque la conversion en participation
    'Réinvestissement',      -- nouveau financement dans une participation existante
    'Sortie partielle',      -- cession d'une partie de la participation
    'Sortie complète',       -- cession totale                       -> statut « Sorti »
    'Radiation',             -- perte totale                         -> statut « Radié »
    'Dépréciation',          -- révision à la baisse de la valorisation
    'Restructuration',       -- rééchelonnement d'un financement
    'Conversion',            -- quasi-equity converti en capital
    'Distribution',          -- dividende ou remboursement aux porteurs
    'Mise sous surveillance' -- vigilance renforcée                  -> statut « En difficulté »
  ));
