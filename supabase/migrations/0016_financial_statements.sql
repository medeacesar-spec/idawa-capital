-- PHASE 1d — États financiers OHADA saisis intégralement, par exercice.
-- Une ligne = un poste (code OHADA) pour une société et un exercice.
-- Seuls les postes SAISIS sont stockés ; totaux et SIG sont calculés à l'affichage.

create table if not exists public.financial_statements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.portfolio_companies(id) on delete cascade,
  fiscal_year integer not null,
  code text not null,                  -- code OHADA : AE, BI, CA, TA, RK…
  amount numeric,
  created_at timestamptz default now(),
  unique (company_id, fiscal_year, code)
);

create index if not exists idx_financial_statements_company on public.financial_statements(company_id, fiscal_year);

alter table public.financial_statements enable row level security;
do $$ begin
  create policy financial_statements_auth_all on public.financial_statements
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
