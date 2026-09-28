-- États financiers au niveau DOSSIER (pipeline), en deux niveaux :
--   1) Chiffres clés par exercice (CA, EBE, résultat net, effectifs) — ce que fournissent les
--      sources de sourcing (PAEB, diagnostics, déclarations du promoteur). Table key_figures,
--      polymorphe (dossier ou société), comme notes / dd_items.
--   2) Liasse OHADA complète : même table financial_statements que le portefeuille, qui accepte
--      désormais un deal_id. Une ligne appartient à UN seul propriétaire (dossier OU société).
-- À la conversion, les deux sont DUPLIQUÉS vers la société (le dossier archivé reste intact).

-- (2) Liasse OHADA sur les dossiers --------------------------------------------------------
alter table public.financial_statements
  add column if not exists deal_id uuid references public.deals(id) on delete cascade;

do $$ begin
  alter table public.financial_statements
    add constraint financial_statements_deal_id_fiscal_year_code_key unique (deal_id, fiscal_year, code);
exception when duplicate_object or duplicate_table then null; end $$;

do $$ begin
  alter table public.financial_statements
    add constraint financial_statements_one_owner check ((company_id is null) <> (deal_id is null));
exception when duplicate_object then null; end $$;

create index if not exists idx_financial_statements_deal on public.financial_statements(deal_id, fiscal_year);

-- (1) Chiffres clés ------------------------------------------------------------------------
create table if not exists public.key_figures (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('deal', 'company')),
  entity_id uuid not null,
  fiscal_year integer not null,
  revenue numeric,        -- chiffre d'affaires (FCFA)
  ebitda numeric,         -- excédent brut d'exploitation (FCFA)
  net_income numeric,     -- résultat net (FCFA)
  employees integer,      -- effectif total
  source text,            -- d'où vient le chiffre : déclaré, PAEB (ADPME), diagnostic, EF…
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (entity_type, entity_id, fiscal_year)
);
create index if not exists idx_key_figures_entity on public.key_figures(entity_type, entity_id);

alter table public.key_figures enable row level security;
do $$ begin
  create policy key_figures_auth_all on public.key_figures
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_audit on public.key_figures;
create trigger trg_audit after insert or delete or update on public.key_figures
  for each row execute function public.audit_trigger();

-- Conversion : dupliquer liasse + chiffres clés vers la société ------------------------------
create or replace function public.convert_deal_to_portfolio(
  p_deal_id uuid, p_invested_date date, p_invested_amount numeric,
  p_ownership numeric, p_valuation numeric, p_country text default null::text
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare d deals%rowtype; new_id uuid; inv numeric; k record; new_kpi uuid;
begin
  select * into d from deals where id = p_deal_id;
  if not found then raise exception 'Dossier introuvable'; end if;
  if exists (select 1 from portfolio_companies where origin_deal_id = p_deal_id) then
    raise exception 'Ce dossier est déjà converti en participation';
  end if;
  inv := coalesce(p_invested_amount, d.amount);

  insert into portfolio_companies(
    fund_id, name, description, founded_year, city, development_stage,
    promoter_name, promoter_bio, promoter_diploma, promoter_age, promoter_gender, promoter_eval,
    primary_sub_sector_id, country, invested_date, invested_amount, currency, ownership_pct,
    current_valuation, tvpi, tri, status, origin_deal_id, investment_officer_id, analyst_id,
    program_id, tracking_type
  ) values (
    d.fund_id, d.company_name, d.description, d.founded_year, d.city, d.development_stage,
    d.promoter_name, d.promoter_bio, d.promoter_diploma, d.promoter_age, d.promoter_gender, d.promoter_eval,
    d.primary_sub_sector_id, p_country, p_invested_date, inv, coalesce(d.currency, 'XOF'),
    coalesce(p_ownership, d.ownership_target), coalesce(p_valuation, inv),
    round(coalesce(p_valuation, inv) / nullif(inv, 0), 2), null, 'Actif', p_deal_id,
    d.investment_officer_id, d.analyst_id, d.program_id, 'equity'
  ) returning id into new_id;

  -- Sous-secteurs : copie (le dossier garde deal_sub_sectors).
  insert into company_sub_sectors(company_id, sub_sector_id)
    select new_id, sub_sector_id from deal_sub_sectors where deal_id = p_deal_id on conflict do nothing;

  -- (1) KPIs + historique de valeurs : COPIE avec nouveaux identifiants.
  for k in select * from tracked_kpis where entity_type = 'deal' and entity_id = p_deal_id loop
    insert into tracked_kpis(entity_type, entity_id, kind, category, name, unit, target, direction)
      values ('company', new_id, k.kind, k.category, k.name, k.unit, k.target, k.direction)
      returning id into new_kpi;
    insert into kpi_values(tracked_kpi_id, period, value)
      select new_kpi, period, value from kpi_values where tracked_kpi_id = k.id;
  end loop;

  -- (1) États financiers : la société poursuit la série d'exercices → COPIE.
  insert into financial_statements(company_id, fiscal_year, code, amount)
    select new_id, fiscal_year, code, amount from financial_statements where deal_id = p_deal_id
    on conflict do nothing;
  insert into key_figures(entity_type, entity_id, fiscal_year, revenue, ebitda, net_income, employees, source, note)
    select 'company', new_id, fiscal_year, revenue, ebitda, net_income, employees, source, note
    from key_figures where entity_type = 'deal' and entity_id = p_deal_id
    on conflict do nothing;

  -- (1) ESG (diagnostic, plan d'action, rating d'impact) : copies.
  insert into esg_assessments(entity_type, entity_id, exclusion_ok, ehs_sector, risk_category)
    select 'company', new_id, exclusion_ok, ehs_sector, risk_category
    from esg_assessments where entity_type = 'deal' and entity_id = p_deal_id;
  insert into esg_actions(entity_type, entity_id, category, action, priority, responsible_code,
      cost_estimate, deliverable, benefit, status, date_start_plan, date_end_plan,
      date_start_real, date_end_real, comment, assignee_id)
    select 'company', new_id, category, action, priority, responsible_code,
      cost_estimate, deliverable, benefit, status, date_start_plan, date_end_plan,
      date_start_real, date_end_real, comment, assignee_id
    from esg_actions where entity_type = 'deal' and entity_id = p_deal_id;
  insert into esg_impact_ratings(entity_type, entity_id, dimension, score, max_score, note)
    select 'company', new_id, dimension, score, max_score, note
    from esg_impact_ratings where entity_type = 'deal' and entity_id = p_deal_id;

  -- (1) Adhésions programme : copies.
  insert into program_memberships(entity_type, entity_id, program_id, date_start, date_end, note)
    select 'company', new_id, program_id, date_start, date_end, note
    from program_memberships where entity_type = 'deal' and entity_id = p_deal_id
    on conflict do nothing;

  -- (2) Notes et due diligence : PAS de copie (lecture en transparence, onglet Origine / instruction).

  -- (3) Comités, contacts, documents : double clé → on garde deal_id, on ajoute company_id.
  update committee_passages set company_id = new_id where deal_id = p_deal_id;
  update contacts  set company_id = new_id where deal_id = p_deal_id;
  update documents set company_id = new_id where deal_id = p_deal_id;

  update deals set status = 'investi', updated_at = now() where id = p_deal_id;
  return new_id;
end;
$function$;
