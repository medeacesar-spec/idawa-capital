-- États financiers alimentés par les dépôts annuels (classeur « Analyses EF » de l'entreprise).
--
-- deposit_statements : la version DÉPOSÉE des états financiers (convention de l'ERP : charges en positif),
--   une ligne par entreprise, exercice et code SYSCOHADA — dernière version déposée.
-- financial_statement_origin : ce que contiennent les états financiers de la fiche pour un exercice :
--   'saisie' (saisis ou importés par l'équipe) ou 'depot' (repris d'un dépôt). Un dépôt ne remplace
--   JAMAIS un exercice saisi : les deux versions s'affichent côte à côte et les écarts sont signalés ;
--   l'équipe peut adopter la version déposée.

create table if not exists public.deposit_statements (
  company_id uuid not null references public.portfolio_companies(id) on delete cascade,
  fiscal_year int not null,
  code text not null,
  amount numeric,
  deposit_id uuid references public.deposits(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (company_id, fiscal_year, code)
);

create table if not exists public.financial_statement_origin (
  company_id uuid not null references public.portfolio_companies(id) on delete cascade,
  fiscal_year int not null,
  origin text not null check (origin in ('saisie', 'depot')),
  deposit_id uuid references public.deposits(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (company_id, fiscal_year)
);

alter table public.deposits add column if not exists statements_summary jsonb;

-- Exercices déjà présents : saisis par l'équipe.
insert into public.financial_statement_origin (company_id, fiscal_year, origin)
select distinct company_id, fiscal_year, 'saisie' from public.financial_statements where company_id is not null
on conflict do nothing;

do $$
declare t text;
begin
  foreach t in array array['deposit_statements', 'financial_statement_origin'] loop
    execute format('alter table public.%I enable row level security', t);
    begin
      execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', t || '_auth_all', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
drop trigger if exists trg_audit on public.financial_statement_origin;
create trigger trg_audit after insert or update or delete on public.financial_statement_origin for each row execute function public.audit_trigger();
