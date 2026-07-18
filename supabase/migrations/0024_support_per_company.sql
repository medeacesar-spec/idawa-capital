-- Suivi de l'accélération PAR ENTREPRISE, agrégé au programme.
--
-- Jusqu'ici les indicateurs d'accélération n'existaient qu'au niveau du programme, et
-- aucun écran ne permettait d'en saisir les valeurs : le tableau de bord lisait des
-- chiffres que personne ne pouvait alimenter. Surtout, « 42 PME accompagnées » ne dit pas
-- ce qui a été fait POUR CHAQUE PME — impossible de justifier l'accompagnement d'une
-- entreprise auprès d'un bailleur.
--
-- Deux natures d'indicateurs coexistent, et les confondre serait une erreur :
--   · ceux qui se comptent PAR ENTREPRISE et s'additionnent (jours d'appui, emplois créés) ;
--   · ceux qui n'ont de sens qu'au NIVEAU DU PROGRAMME (budget alloué, % de femmes,
--     taux d'exécution budgétaire) — additionner des pourcentages n'a aucun sens.

alter table program_indicators
  add column if not exists scope text not null default 'entreprise';

alter table program_indicators drop constraint if exists program_indicators_scope_check;
alter table program_indicators add constraint program_indicators_scope_check
  check (scope in ('programme', 'entreprise'));

-- Répartition initiale d'après la nature de chaque indicateur.
-- Les moyens financiers et tout ce qui s'exprime en pourcentage restent au programme.
update program_indicators
   set scope = 'programme'
 where category = 'Moyens'
    or unit = '%'
    or name in ('PME/entreprises accompagnées', 'Nouveaux bénéficiaires');

-- Valeurs saisies entreprise par entreprise, période par période.
create table if not exists company_indicator_values (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references portfolio_companies(id) on delete cascade,
  program_indicator_id uuid not null references program_indicators(id) on delete cascade,
  period text not null,
  value numeric,
  note text,
  created_at timestamptz not null default now(),
  unique (company_id, program_indicator_id, period)
);

alter table company_indicator_values enable row level security;
drop policy if exists auth_all on company_indicator_values;
create policy auth_all on company_indicator_values
  for all to authenticated using (true) with check (true);

create index if not exists company_indicator_values_company_idx
  on company_indicator_values (company_id, period);
