-- Ajoute le statut « Radié » (société rayée / perte totale) aux sociétés du portefeuille.
-- À exécuter dans Supabase → SQL Editor.
alter table public.portfolio_companies
  drop constraint if exists portfolio_companies_status_check;

alter table public.portfolio_companies
  add constraint portfolio_companies_status_check
  check (status in ('Actif', 'En difficulté', 'Sorti', 'Radié'));
