-- Complète la symétrie fiche société ↔ fiche dossier (gel de tests levé 2026-07-19).

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
