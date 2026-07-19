-- EN ATTENTE — NE PAS APPLIQUER pendant la période de tests (base gelée).
-- Complète la symétrie fiche société / fiche dossier avec des champs structurés.

-- Onglet Présentation société : champs que la fiche I&P attend aussi.
alter table public.portfolio_companies
  add column if not exists founded_year integer,
  add column if not exists city text,
  add column if not exists development_stage text;

-- Bilan de sortie : pendant du post-mortem d'un dossier écarté, sur une société sortie.
alter table public.portfolio_companies
  add column if not exists exit_review text;

comment on column public.portfolio_companies.exit_review is
  'Ce que l''on retient d''une participation sortie ou radiée — pendant du post-mortem d''un dossier écarté.';
