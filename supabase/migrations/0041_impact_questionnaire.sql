-- Questionnaire d'impact annuel par PME (référentiel I&P / IPDEV).
-- Une ligne par entité (société ou dossier) et par exercice fiscal ; les réponses tiennent
-- dans un jsonb (structure fidèle au tableur, ~60 champs, cellules H/F et totaux calculés).
create table if not exists public.impact_questionnaires (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('deal', 'company')),
  entity_id uuid not null,
  year int not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  unique (entity_type, entity_id, year)
);

-- Même politique RLS que le reste du schéma : accès plein pour les authentifiés.
alter table public.impact_questionnaires enable row level security;
drop policy if exists auth_all on public.impact_questionnaires;
create policy auth_all on public.impact_questionnaires for all to authenticated using (true) with check (true);
