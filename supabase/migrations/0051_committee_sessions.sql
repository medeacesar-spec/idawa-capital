-- Séances de comité avec membres extérieurs à Idawa.
--
-- Idawa prépare une séance (ordre du jour = dossiers / sociétés présentés), y invite des
-- membres (contacts « Membre de comité ») qui reçoivent chacun un LIEN PERSONNEL (jeton, sans
-- compte). Les pièces présentées sont COPIÉES à l'ajout (dossier de séance figé : tout le monde
-- se prononce sur la même version). Les membres commentent et donnent un avis CONSULTATIF ;
-- commentaires et avis sont visibles par tous les membres. À la clôture, Idawa enregistre la
-- décision de chaque dossier (committee_passages « Proposée ») qui suit la chaîne interne de
-- validation existante.

create table if not exists public.committee_sessions (
  id uuid primary key default gen_random_uuid(),
  committee_type text not null,
  title text not null,
  session_date date,
  -- Échéance obligatoire (règle générale) : date limite de remise des avis.
  opinion_deadline date not null,
  status text not null default 'Préparation' check (status in ('Préparation', 'Ouverte', 'Close')),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz default now(),
  opened_at timestamptz,
  closed_at timestamptz
);

create table if not exists public.committee_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.committee_sessions(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  company_id uuid references public.portfolio_companies(id) on delete cascade,
  position int not null default 0,
  -- Décision enregistrée par Idawa à la clôture.
  passage_id uuid references public.committee_passages(id) on delete set null,
  created_at timestamptz default now(),
  check (num_nonnulls(deal_id, company_id) = 1)
);
create unique index if not exists committee_items_deal_uq on public.committee_session_items(session_id, deal_id) where deal_id is not null;
create unique index if not exists committee_items_company_uq on public.committee_session_items(session_id, company_id) where company_id is not null;

create table if not exists public.committee_session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.committee_sessions(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  name text not null,
  email text,
  organization text,
  token uuid not null unique default gen_random_uuid(),
  invited_at timestamptz,
  confidentiality_accepted_at timestamptz,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now()
);
create unique index if not exists committee_members_contact_uq on public.committee_session_members(session_id, contact_id) where contact_id is not null;

-- Pièces du dossier de séance : copies figées dans le stockage « documents ».
create table if not exists public.committee_documents (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.committee_session_items(id) on delete cascade,
  name text not null,
  storage_path text not null,
  size bigint,
  sp_item_id text,
  sp_modified_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.committee_opinions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.committee_session_items(id) on delete cascade,
  member_id uuid not null references public.committee_session_members(id) on delete cascade,
  conflict boolean not null default false,
  opinion text check (opinion in ('Favorable', 'Favorable sous conditions', 'Ajourné', 'Défavorable')),
  conditions text,
  comment text,
  updated_at timestamptz default now(),
  unique (item_id, member_id)
);

create table if not exists public.committee_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.committee_session_items(id) on delete cascade,
  member_id uuid references public.committee_session_members(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  body text not null,
  created_at timestamptz default now()
);

-- Qui a ouvert / téléchargé quoi, et quand.
create table if not exists public.committee_access_log (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.committee_session_members(id) on delete cascade,
  document_id uuid references public.committee_documents(id) on delete set null,
  action text not null,
  at timestamptz default now()
);

create index if not exists idx_committee_items_session on public.committee_session_items(session_id);
create index if not exists idx_committee_members_session on public.committee_session_members(session_id);
create index if not exists idx_committee_documents_item on public.committee_documents(item_id);
create index if not exists idx_committee_opinions_item on public.committee_opinions(item_id);
create index if not exists idx_committee_comments_item on public.committee_comments(item_id);
create index if not exists idx_committee_access_member on public.committee_access_log(member_id);

-- Même politique que le reste du schéma pour l'équipe connectée. Les membres extérieurs
-- n'ont AUCUN accès direct : leurs pages passent par le serveur, après contrôle du jeton.
do $$
declare t text;
begin
  foreach t in array array['committee_sessions','committee_session_items','committee_session_members',
                           'committee_documents','committee_opinions','committee_comments','committee_access_log'] loop
    execute format('alter table public.%I enable row level security', t);
    begin
      execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', t || '_auth_all', t);
    exception when duplicate_object then null;
    end;
  end loop;
  foreach t in array array['committee_sessions','committee_session_items','committee_session_members',
                           'committee_documents','committee_opinions','committee_comments'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or delete or update on public.%I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;
