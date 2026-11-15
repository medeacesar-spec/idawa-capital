-- Dépôts des entreprises (feuille de route, phase 4).
-- Un dépôt = un fichier déposé par le référent via son lien personnel, pour une période.
-- Premier dépôt d'une période = V0 (figé) ; dépôts suivants = V1, V2… Chaque version est
-- conservée entière : fichier dans « Idawa Depots » (journal sharepoint_writes) et chiffres lus
-- (deposit_lines), pour comparer les versions et garder la V0 même si le fichier disparaissait.

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.portfolio_companies(id) on delete cascade,
  kind text not null check (kind in ('mensuel', 'annuel', 'releve')),
  period text not null,                  -- 2026-M11 | 2025 | 2026-T3
  version int not null,
  write_id uuid references public.sharepoint_writes(id) on delete set null,
  original_name text,
  size bigint,
  sha256 text,
  reason text,                           -- motif, obligatoire si des chiffres déjà déposés changent
  changes jsonb not null default '[]'::jsonb,
  changes_count int not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (company_id, kind, period, version)
);
create index if not exists idx_deposits_company on public.deposits(company_id, created_at desc);

create table if not exists public.deposit_lines (
  id bigint generated always as identity primary key,
  deposit_id uuid not null references public.deposits(id) on delete cascade,
  sheet text not null,
  code text not null,
  label text,
  unit text,
  vals jsonb not null
);
create index if not exists idx_deposit_lines_deposit on public.deposit_lines(deposit_id);

do $$
declare t text;
begin
  foreach t in array array['deposits', 'deposit_lines'] loop
    execute format('alter table public.%I enable row level security', t);
    begin
      execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', t || '_auth_all', t);
    exception when duplicate_object then null;
    end;
  end loop;
  execute 'drop trigger if exists trg_audit on public.deposits';
  execute 'create trigger trg_audit after insert or delete or update on public.deposits for each row execute function public.audit_trigger()';
end $$;
