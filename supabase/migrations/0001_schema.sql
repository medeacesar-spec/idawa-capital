-- ============================================================
-- Idawa Capital — Schéma de base de données (Phase 2)
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- ============================================================

-- Fonction utilitaire : met à jour automatiquement updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ------------------------------------------------------------
-- RÉFÉRENTIEL & CONFIGURATION
-- ------------------------------------------------------------

create table if not exists public.funds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Programmes : avec la NATURE (investissement / accompagnement / mixte)
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid references public.funds(id) on delete cascade,
  name text not null,
  color text default '#6B5744',
  nature text not null default 'invest' check (nature in ('invest','accompagnement','mixte')),
  position int default 0,
  created_at timestamptz default now()
);

-- Taxonomie : industries -> sous-secteurs
create table if not exists public.industries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int default 0
);

create table if not exists public.sub_sectors (
  id uuid primary key default gen_random_uuid(),
  industry_id uuid references public.industries(id) on delete cascade,
  name text not null,
  position int default 0
);

-- Bibliothèque de KPIs par défaut (panier par sous-secteur)
create table if not exists public.kpi_library (
  id uuid primary key default gen_random_uuid(),
  sub_sector_id uuid references public.sub_sectors(id) on delete cascade,
  category text not null check (category in ('Management','Commercial','Production','Support')),
  name text not null,
  position int default 0
);

-- ------------------------------------------------------------
-- ACCÈS : rôles configurables + profils
-- ------------------------------------------------------------

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_preset boolean default false,
  -- permissions par module : { "pipeline":"E", "consolide":"L", ... } (V/E/L/-)
  permissions jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role_id uuid references public.roles(id),
  created_at timestamptz default now()
);

-- Portée par programme (vide = accès global)
create table if not exists public.user_program_scope (
  user_id uuid references public.profiles(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  primary key (user_id, program_id)
);

-- ------------------------------------------------------------
-- DEALS (pipeline) & PORTEFEUILLE
-- ------------------------------------------------------------

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid references public.funds(id) on delete set null,
  company_name text not null,
  description text,
  thesis text,
  primary_sub_sector_id uuid references public.sub_sectors(id) on delete set null,
  stage text not null default 'Sourcing'
    check (stage in ('Sourcing','Analyse','Due Diligence','Négociation','Closing','Investi','Perdu')),
  amount numeric default 0,
  currency text default 'XOF',
  ownership_target numeric,
  valuation_pre numeric,
  probability int default 0,
  expected_close date,
  source text,
  investment_officer_id uuid references public.profiles(id) on delete set null,
  analyst_id uuid references public.profiles(id) on delete set null,
  track_kpis boolean default false,
  status text default 'actif',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger deals_updated before update on public.deals
  for each row execute function public.set_updated_at();

-- Sous-secteurs secondaires d'un deal (le principal est sur deals)
create table if not exists public.deal_sub_sectors (
  deal_id uuid references public.deals(id) on delete cascade,
  sub_sector_id uuid references public.sub_sectors(id) on delete cascade,
  primary key (deal_id, sub_sector_id)
);

create table if not exists public.portfolio_companies (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid references public.funds(id) on delete set null,
  name text not null,
  description text,
  primary_sub_sector_id uuid references public.sub_sectors(id) on delete set null,
  country text default 'Bénin',
  invested_date date,
  invested_amount numeric default 0,
  currency text default 'XOF',
  ownership_pct numeric,
  current_valuation numeric,
  tvpi numeric,
  tri numeric,
  status text default 'Actif' check (status in ('Actif','En difficulté','Sorti')),
  origin_deal_id uuid references public.deals(id) on delete set null,
  investment_officer_id uuid references public.profiles(id) on delete set null,
  analyst_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger companies_updated before update on public.portfolio_companies
  for each row execute function public.set_updated_at();

create table if not exists public.company_sub_sectors (
  company_id uuid references public.portfolio_companies(id) on delete cascade,
  sub_sector_id uuid references public.sub_sectors(id) on delete cascade,
  primary key (company_id, sub_sector_id)
);

-- Historique daté d'appartenance aux programmes (deals & sociétés)
create table if not exists public.program_memberships (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('deal','company')),
  entity_id uuid not null,
  program_id uuid references public.programs(id) on delete cascade,
  date_start date,
  date_end date,
  note text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- COMITÉS (historique des passages, multi-passages)
-- ------------------------------------------------------------

create table if not exists public.committee_passages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  committee_type text not null,
  session_date date,
  decision text check (decision in ('Favorable','Favorable sous conditions','Ajourné','Défavorable')),
  conditions text,
  participants text,
  minutes text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- KPIs & REPORTING (business + ESG), polymorphe (deal ou société)
-- ------------------------------------------------------------

create table if not exists public.tracked_kpis (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('deal','company')),
  entity_id uuid not null,
  kind text not null default 'business' check (kind in ('business','esg')),
  category text not null, -- Management/Commercial/Production/Support ou Environnement/Social/Gouvernance
  name text not null,
  unit text,
  target numeric,
  direction text default 'high' check (direction in ('high','low')),
  created_at timestamptz default now()
);

create table if not exists public.kpi_values (
  id uuid primary key default gen_random_uuid(),
  tracked_kpi_id uuid references public.tracked_kpis(id) on delete cascade,
  period text not null, -- ex '2026-T2'
  value numeric,
  created_at timestamptz default now(),
  unique (tracked_kpi_id, period)
);

-- ------------------------------------------------------------
-- ESG & IMPACT (méthodologie I&P / IFC)
-- ------------------------------------------------------------

create table if not exists public.esg_assessments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('deal','company')),
  entity_id uuid not null,
  exclusion_ok boolean,
  ehs_sector text,
  risk_category text check (risk_category in ('A','B','C')),
  created_at timestamptz default now()
);

create table if not exists public.esg_risk_ratings (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.esg_assessments(id) on delete cascade,
  standard text not null, -- PS1..PS8, GOUV
  applicable boolean default true,
  level text check (level in ('Élevé','Moyen-Élevé','Moyen','Faible-Moyen','Faible')),
  risks text,
  opportunities text
);

create table if not exists public.esg_impact_ratings (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('deal','company')),
  entity_id uuid not null,
  dimension text not null, -- ENTREPRENEURS/CLIENTS/EMPLOYES/CONTRACTANTS
  score numeric default 0,
  max_score numeric,
  note text
);

create table if not exists public.esg_actions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('deal','company')),
  entity_id uuid not null,
  category text check (category in ('E','S','G')),
  action text not null,
  priority text check (priority in ('Très haute','Haute','Moyenne','Basse')),
  responsible_code text, -- RI/PR/RM/AT
  cost_estimate text,
  deliverable text,
  benefit text,
  status text default 'À lancer'
    check (status in ('Réalisée','En cours','À lancer','Objectif à plus d''un an','Abandonnée','Action en continu')),
  date_start_plan date,
  date_end_plan date,
  date_start_real date,
  date_end_real date,
  comment text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- RELATION : contacts, documents, partenaires
-- ------------------------------------------------------------

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  function text,
  organization text,
  org_type text, -- Participation / Pipeline / Équipe Idawa / Bailleur / Consultant / Comité
  email text,
  phone text,
  notes text,
  deal_id uuid references public.deals(id) on delete set null,
  company_id uuid references public.portfolio_companies(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  storage_path text,
  url text,
  deal_id uuid references public.deals(id) on delete set null,
  company_id uuid references public.portfolio_companies(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  relation_type text check (relation_type in ('Investisseur fonds','Bailleur programme','Co-investisseur')),
  fund_id uuid references public.funds(id) on delete set null,
  program_id uuid references public.programs(id) on delete set null,
  status text check (status in ('Engagé','En discussion','Due diligence')),
  amount_committed numeric default 0,
  amount_discussion numeric default 0,
  notes text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- ACTIVITÉ : notes, actions de suivi, suivi du temps
-- ------------------------------------------------------------

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('deal','company')),
  entity_id uuid not null,
  type text default 'Note' check (type in ('Réunion','Appel','Email','Note')),
  note_date date default now(),
  participants text,
  summary text,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('deal','company')),
  entity_id uuid not null,
  title text not null,
  assignee_id uuid references public.profiles(id) on delete set null,
  assignee_label text,
  due_date date,
  status text default 'À faire' check (status in ('À faire','En cours','Fait')),
  source text, -- ex 'comité', 'note'
  created_at timestamptz default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('deal','company')),
  entity_id uuid not null,
  user_id uuid references public.profiles(id) on delete set null,
  member_label text,
  hours numeric default 0,
  entry_date date default now(),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- SÉCURITÉ (RLS) : accès réservé aux utilisateurs authentifiés.
-- (Les politiques fines par rôle seront ajoutées dans une étape dédiée.)
-- ------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists auth_all on public.%I;', t);
    execute format('create policy auth_all on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Création automatique d'un profil à l'inscription d'un utilisateur
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
