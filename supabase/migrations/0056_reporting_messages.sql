-- Communications du suivi (feuille de route, phase 5).
--
-- reporting_messages : chaque e-mail envoyé à un entrepreneur ou à l'équipe au sujet d'un dépôt.
-- La clé unique (entreprise, type, période, destinataire) garantit qu'un même message ne part
-- qu'une fois, même si l'envoi quotidien est relancé plusieurs fois dans la journée.
--   ouverture : la période est ouverte (au jour d'ouverture choisi), avec le lien de dépôt
--   rappel    : 2 jours avant l'échéance, si rien n'est déposé
--   retard    : le lendemain de l'échéance, si rien n'est déposé (au référent)
--   retard_equipe : même moment, au chargé de suivi et au suppléant
--   accuse    : accusé de réception d'un dépôt (au référent)
--   depot_equipe  : un dépôt est arrivé (au chargé et au suppléant, avec les changements)

create table if not exists public.reporting_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.portfolio_companies(id) on delete cascade,
  kind text not null check (kind in ('ouverture', 'rappel', 'retard', 'retard_equipe', 'accuse', 'depot_equipe')),
  period text not null,                 -- 2026-M11 (mensuel) ou 2026 (exercice) ; version du dépôt incluse pour accuse/depot_equipe
  recipient text not null,
  sent_at timestamptz not null default now(),
  origin text not null default 'auto',  -- auto (envoi quotidien) | manuel (bouton de l'équipe)
  unique (company_id, kind, period, recipient)
);
create index if not exists idx_reporting_messages_company on public.reporting_messages(company_id, sent_at desc);

alter table public.reporting_messages enable row level security;
do $$ begin
  create policy reporting_messages_auth_all on public.reporting_messages for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
