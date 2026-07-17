-- PHASE 1a — Instruments de financement d'une participation.
-- Une société peut avoir PLUSIEURS instruments, ajoutables à tout moment :
--   equity (capital) · quasi-equity (prêt d'actionnaire) · prêt de campagne.
-- À exécuter dans Supabase → SQL Editor.

create table if not exists public.financing_instruments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.portfolio_companies(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,   -- origine éventuelle
  type text not null check (type in ('equity', 'quasi-equity', 'pret-campagne')),
  label text,                          -- ex : « Prêt d'actionnaire 2024 »
  currency text default 'XOF',
  amount_committed numeric,            -- montant engagé
  amount_disbursed numeric,            -- montant décaissé
  grant_date date,                     -- date d'octroi / d'entrée
  -- Spécifique EQUITY
  ownership_pct numeric,
  valuation_method text,
  valuation numeric,                   -- valorisation à date (annuelle)
  -- Spécifique DETTE (quasi-equity / prêt de campagne)
  interest_rate numeric,               -- taux annuel (%)
  variable_rate numeric,               -- part variable / spread (%)
  rate_cap numeric,                    -- taux plafond (%)
  grace_months integer,                -- différé (mois)
  duration_months integer,             -- durée (mois)
  periodicity text,                    -- 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle'
  first_due_date date,                 -- date de première échéance
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_financing_instruments_company on public.financing_instruments(company_id);

alter table public.financing_instruments enable row level security;
do $$ begin
  create policy financing_instruments_auth_all on public.financing_instruments
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
