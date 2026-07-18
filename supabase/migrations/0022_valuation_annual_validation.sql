-- Séparer la valorisation de la performance (retour de Nouss Bih, I&P).
--
-- Une valorisation n'est pas un flux comme un autre et ne se révise pas en continu :
-- elle est arrêtée UNE FOIS PAR EXERCICE et validée par le comité d'audit. Tant qu'elle
-- n'est pas validée, c'est une proposition qui ne doit pas circuler comme un chiffre ferme.
-- La performance commerciale et financière, elle, se suit trimestriellement — c'est un
-- autre rythme, donc un autre écran.
--
-- Ces colonnes ne concernent que les lignes de type « Valorisation » ; les appels de fonds
-- et distributions gardent leur fonctionnement, sans exercice ni validation.

alter table company_flows
  add column if not exists fiscal_year integer,
  add column if not exists status text,
  add column if not exists validated_by uuid references auth.users(id),
  add column if not exists validated_at timestamptz;

alter table company_flows drop constraint if exists company_flows_status_check;
alter table company_flows add constraint company_flows_status_check
  check (status is null or status in ('Proposée', 'Validée'));

-- Reprise de l'existant : l'exercice se déduit de la date, et la valorisation la plus
-- récente de chaque exercice est réputée arrêtée. Les révisions antérieures du même
-- exercice restent en base comme propositions — on ne supprime aucun historique.
update company_flows f
   set fiscal_year = coalesce(f.fiscal_year, extract(year from f.flow_date)::int),
       status = coalesce(
         f.status,
         case when f.id = (
           select f2.id from company_flows f2
            where f2.company_id = f.company_id
              and f2.type = 'Valorisation'
              and extract(year from f2.flow_date) = extract(year from f.flow_date)
            order by f2.flow_date desc, f2.created_at desc
            limit 1
         ) then 'Validée' else 'Proposée' end)
 where f.type = 'Valorisation';

-- La règle de cadence porte sur le chiffre FERME : un seul arrêté par exercice.
-- Les propositions peuvent coexister, c'est le travail normal avant le comité d'audit.
create unique index if not exists company_flows_one_validated_valuation_per_year
  on company_flows (company_id, fiscal_year)
  where type = 'Valorisation' and status = 'Validée';
