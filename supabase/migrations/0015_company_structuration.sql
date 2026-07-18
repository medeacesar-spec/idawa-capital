-- PHASE 2 — Structuration & sortie d'une participation.
-- Champs repris de la fiche entreprise I&P (Données figées) + retour de Nouss
-- (« il manque un onglet descriptif sur la structuration : piste de sortie,
--   put option ? avec quelle formule ? sortie à prévoir sur un tiers ? »).

alter table public.portfolio_companies
  add column if not exists valuation_method_entry text,     -- méthode de valo à l'acquisition
  add column if not exists valuation_method_current text,   -- méthode de valo à date
  add column if not exists exit_scenario text,              -- scénario de sortie retenu
  add column if not exists exit_strategy text,              -- piste de sortie détaillée (put option, formule…)
  add column if not exists exit_multiple_target numeric,    -- multiple de sortie attendu
  add column if not exists exit_irr_target numeric,         -- TRI de sortie attendu (%)
  add column if not exists exit_year integer;               -- année de sortie attendue
