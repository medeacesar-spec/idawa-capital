-- ============================================================
-- Idawa Capital — Indicateurs d'accompagnement (Phase 3)
-- Catalogue configurable + indicateurs par programme + valeurs
-- ============================================================

-- Catalogue (panier d'options), éditable en Admin
create table if not exists public.accompagnement_library (
  id uuid primary key default gen_random_uuid(),
  category text not null,  -- Moyens/Bénéficiaires/Activités/Réalisations/Résultats
  name text not null,
  unit text,
  position int default 0
);

-- Indicateurs choisis pour un programme (+ personnalisés)
create table if not exists public.program_indicators (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,
  category text not null,
  name text not null,
  unit text,
  target numeric,
  is_custom boolean default false,
  position int default 0,
  created_at timestamptz default now()
);

-- Valeurs par période (niveau programme)
create table if not exists public.program_indicator_values (
  id uuid primary key default gen_random_uuid(),
  program_indicator_id uuid references public.program_indicators(id) on delete cascade,
  period text not null,
  value numeric,
  created_at timestamptz default now(),
  unique (program_indicator_id, period)
);

-- RLS (authentifiés) sur les nouvelles tables
do $$
declare t text;
begin
  for t in select unnest(array['accompagnement_library','program_indicators','program_indicator_values']) loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists auth_all on public.%I;', t);
    execute format('create policy auth_all on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- Seed du catalogue
insert into public.accompagnement_library (category, name, unit, position) values
  ('Moyens', 'Budget alloué', 'FCFA', 0),
  ('Moyens', 'Montant décaissé', 'FCFA', 1),
  ('Moyens', 'Taux d''exécution budgétaire', '%', 2),
  ('Moyens', 'Cofinancement mobilisé', 'FCFA', 3),
  ('Moyens', 'Coût moyen par bénéficiaire', 'FCFA', 4),
  ('Bénéficiaires', 'PME/entreprises accompagnées', 'nb', 0),
  ('Bénéficiaires', 'Entrepreneurs formés', 'nb', 1),
  ('Bénéficiaires', '% femmes bénéficiaires', '%', 2),
  ('Bénéficiaires', '% jeunes (<35 ans)', '%', 3),
  ('Bénéficiaires', '% en milieu rural', '%', 4),
  ('Bénéficiaires', 'Nouveaux bénéficiaires (période)', 'nb', 5),
  ('Activités', 'Jours d''assistance technique (AT)', 'jours', 0),
  ('Activités', 'Missions d''accompagnement', 'nb', 1),
  ('Activités', 'Sessions de formation', 'nb', 2),
  ('Activités', 'Ateliers / événements', 'nb', 3),
  ('Activités', 'Diagnostics d''entreprise réalisés', 'nb', 4),
  ('Activités', 'Consultants/experts mobilisés', 'nb', 5),
  ('Réalisations', 'Plans d''affaires élaborés', 'nb', 0),
  ('Réalisations', 'Entreprises formalisées', 'nb', 1),
  ('Réalisations', 'Certifications/labels obtenus', 'nb', 2),
  ('Réalisations', 'Outils de gestion mis en place', 'nb', 3),
  ('Réalisations', 'Mises en relation financement/marché', 'nb', 4),
  ('Résultats', 'Emplois créés', 'nb', 0),
  ('Résultats', 'Emplois soutenus/maintenus', 'nb', 1),
  ('Résultats', 'Croissance du CA des PME', '%', 2),
  ('Résultats', 'Financements levés par les PME', 'FCFA', 3),
  ('Résultats', 'Taux de survie des entreprises', '%', 4),
  ('Résultats', 'Accès à de nouveaux marchés', 'nb', 5)
on conflict do nothing;
