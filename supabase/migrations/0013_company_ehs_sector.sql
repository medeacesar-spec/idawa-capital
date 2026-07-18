-- Secteur EHS : le PROGRAMME porte une FAMILLE de secteurs (ex. « Agriculture & alimentaire »),
-- chaque SOCIÉTÉ porte son secteur précis (ex. « Coton & égrenage »).
-- programs.ehs_sector existe déjà et stocke désormais la FAMILLE.

alter table public.portfolio_companies
  add column if not exists ehs_sector text;
